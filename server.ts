import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import crypto from "crypto";

dotenv.config();

// Load firebase-applet-config.json
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (err) {
    console.error("Failed to parse firebase-applet-config.json:", err);
  }
}

// Initialize firebase-admin with Application Default Credentials or firebaseConfig
let adminApp: any;
let isFirebaseInitialized = false;

function ensureFirebaseInitialized() {
  if (isFirebaseInitialized) return;

  try {
    if (firebaseConfig.projectId) {
      adminApp = admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log("Firebase Admin initialized successfully with projectId:", firebaseConfig.projectId);
    } else {
      adminApp = admin.initializeApp();
      console.log("Firebase Admin initialized with default credentials");
    }
    isFirebaseInitialized = true;
  } catch (err) {
    console.warn("Failed to initialize Firebase Admin:", err);
    isFirebaseInitialized = false;
  }
}

function getAdminDb() {
  ensureFirebaseInitialized();
  if (!adminApp) {
    throw new Error("Firebase Admin SDK is not initialized. Please check configuration.");
  }
  return firebaseConfig.firestoreDatabaseId
    ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(adminApp);
}

function getAdminAuth() {
  ensureFirebaseInitialized();
  if (!adminApp) {
    throw new Error("Firebase Admin SDK is not initialized. Please check configuration.");
  }
  return getAuth(adminApp);
}

// Initialize Gemini SDK lazily to avoid crashing on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const app = express();
app.use(express.json());

const PORT = 3000;

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Check if a Firebase Auth user profile exists for an email address
app.post("/api/auth/check-status", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    try {
      const authInstance = getAdminAuth();
      await authInstance.getUserByEmail(email.trim().toLowerCase());
      return res.json({ exists: true });
    } catch (authErr: any) {
      if (authErr.code === "auth/user-not-found" || authErr.message?.includes("user-not-found")) {
        return res.json({ exists: false });
      }
      throw authErr;
    }
  } catch (err: any) {
    console.warn("Could not check account status server-side (using default fallback true):", err.message);
    // Return exists: true as fallback if Firebase Admin is unconfigured/offline
    return res.json({ exists: true, warning: "Admin SDK bypassed or offline" });
  }
});

// Helper to verify Admin ID Token and check if the user is an authorized admin
async function verifyAdminCaller(req: express.Request, res: express.Response): Promise<any | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization token. Access denied." });
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    const callerDoc = await getAdminDb().collection("users").doc(callerUid).get();
    if (!callerDoc.exists) {
      res.status(403).json({ error: "Access denied. Admin profile not found in database." });
      return null;
    }

    const callerData = callerDoc.data();
    if (callerData?.role !== "super_admin" && callerData?.role !== "municipal_admin") {
      res.status(403).json({ error: "Access denied. Only municipal/super administrators can perform this action." });
      return null;
    }

    return callerData;
  } catch (err: any) {
    console.error("Token verification failed:", err);
    res.status(401).json({ error: `Authentication failed: ${err.message}` });
    return null;
  }
}

// Secure User Provisioning Route
app.post("/api/admin/users/create", async (req, res) => {
  try {
    const caller = await verifyAdminCaller(req, res);
    if (!caller) return; // Response sent in helper

    const {
      email,
      password,
      name,
      phone,
      physicalAddress,
      username,
      role,
      employeeNumber,
      saIdNumber,
      wardNumber,
      wardName,
      politicalPosition,
      profilePicture
    } = req.body;

    if (!email || !password || !name || !username || !role) {
      return res.status(400).json({ error: "Mandatory fields: email, password, name, username, and role are required." });
    }

    const validRoles = ["super_admin", "municipal_admin", "technician", "councillor"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role specified: "${role}".` });
    }

    // Role safety: Only super_admin can create admin roles
    if (role === "super_admin" || role === "municipal_admin") {
      if (caller.role !== "super_admin") {
        return res.status(403).json({ error: "Access denied. Only Super Administrators can provision administrative accounts." });
      }
    }

    // Double check duplicate usernames or emails in Firestore
    const emailCheck = await getAdminDb().collection("users").where("email", "==", email.trim().toLowerCase()).get();
    if (!emailCheck.empty) {
      return res.status(400).json({ error: "The email address is already registered to another account." });
    }

    const usernameCheck = await getAdminDb().collection("users").where("username", "==", username.trim().toLowerCase()).get();
    if (!usernameCheck.empty) {
      return res.status(400).json({ error: "The LDAP username is already registered to another account." });
    }

    // 1. Create User in Firebase Auth
    const authUser = await getAdminAuth().createUser({
      email: email.trim(),
      password: password,
      displayName: name.trim()
    });

    // 2. Create corresponding profile document in Firestore with UID matching Firebase Auth exactly
    const newUser = {
      id: authUser.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || "").trim(),
      physicalAddress: (physicalAddress || "").trim(),
      username: username.trim().toLowerCase(),
      role: role,
      employeeNumber: (employeeNumber || "").trim(),
      saIdNumber: (saIdNumber || "").trim(),
      wardNumber: wardNumber !== undefined && wardNumber !== null ? Number(wardNumber) : null,
      wardName: wardName || null,
      politicalPosition: politicalPosition || null,
      status: "active",
      profilePicture: (profilePicture || "").trim() || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
      dateCreated: new Date().toISOString()
    };

    await getAdminDb().collection("users").doc(authUser.uid).set(newUser);
    console.log(`Secured account provisioned successfully: ${email} UID: ${authUser.uid}`);

    res.json({ uid: authUser.uid, message: "User provisioned successfully." });
  } catch (err: any) {
    console.error("User creation failed:", err);
    res.status(500).json({ error: err.message || "An unexpected error occurred during user provisioning." });
  }
});

// Secure Toggle User Status Route (Allows Super Admins to suspend/unsuspend user accounts)
app.post("/api/admin/users/toggle-status", async (req, res) => {
  try {
    const caller = await verifyAdminCaller(req, res);
    if (!caller) return; // Response sent in helper

    if (caller.role !== "super_admin") {
      return res.status(403).json({ error: "Access denied. Only Super Administrators can alter user account statuses." });
    }

    const { userId, currentStatus } = req.body;
    if (!userId || !currentStatus) {
      return res.status(400).json({ error: "Missing required fields: userId and currentStatus." });
    }

    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    // 1. Update in Firebase Authentication (disable / enable user)
    await getAdminAuth().updateUser(userId, {
      disabled: nextStatus === "inactive"
    });

    // 2. Update in Firestore profile
    await getAdminDb().collection("users").doc(userId).update({
      status: nextStatus
    });

    console.log(`User status altered successfully. UID: ${userId}, Status: ${nextStatus}`);
    res.json({ success: true, nextStatus });
  } catch (err: any) {
    console.error("Status toggle failed:", err);
    res.status(500).json({ error: err.message || "An unexpected error occurred during status modification." });
  }
});

// Secure server-side Gemini API route for analysis, classification, and duplicate detection
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { title, description, wardNumber, wardName, village, location, existingComplaints } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required." });
    }

    const ai = getAiClient();
    
    // Construct existing complaints string for duplicate detection (comparing ward, location, category, etc.)
    const formattedExisting = (existingComplaints || [])
      .map((c: any) => `ID: ${c.id}, Title: "${c.title}", Category: "${c.category}", Ward: ${c.wardNumber}, Village: "${c.village || ""}", Status: "${c.status}"`)
      .join("\n");

    const prompt = `
You are the AI Dispatch Assistant for the Thulamela Municipality CRM.
Analyze the following citizen complaint submission:
Title: "${title}"
Description: "${description}"
Ward: ${wardNumber || "Not specified"} (${wardName || "Not specified"})
Village: "${village || "Not specified"}"
Location Details: "${location || "Not specified"}"

Here are some of the active complaints currently logged in the system:
${formattedExisting || "No active complaints currently logged."}

Please perform the following tasks and return your response in a valid JSON format:
1. "summary": A concise, professional 1-2 sentence summary of the complaint.
2. "category": Suggest the most appropriate municipal department category from: ["Water & Sanitation", "Electricity & Energy", "Roads & Stormwater", "Waste Management", "Community Services", "Finance & Billing"].
3. "subCategory": A granular sub-category (e.g., "Pipe Burst", "Sewer Spill", "Pothole", "Streetlight Repair", "Illegal Dumping").
4. "priority": Determine priority level based on public impact and danger: ["Critical", "High", "Medium", "Low"].
5. "recommendedDepartment": Recommend the municipal department name (e.g., "Civil Engineering", "Electrical Services", "Water Services", "Environmental Health", "Revenue & Customer Care").
6. "duplicateDetected": Boolean indicating if a very similar complaint already exists in the same ward/area.
7. "duplicateOfId": If duplicateDetected is true, provide the ID of the existing complaint that is likely the original, otherwise null.
8. "recommendingAction": A brief instruction for the field dispatch technician.

Your response must be ONLY valid JSON, with no markdown code block backticks, wrapping or formatting, so that it can be parsed directly.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
    });

    const responseText = response.text || "";
    // Clean potential markdown backticks from response
    const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    let result;
    try {
      result = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON, raw text:", responseText);
      // Fallback response
      result = {
        summary: description.substring(0, 100) + "...",
        category: "Community Services",
        subCategory: "General Inquiry",
        priority: "Medium",
        recommendedDepartment: "General Administration",
        duplicateDetected: false,
        duplicateOfId: null,
        recommendingAction: "Review manually."
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error in Gemini API route /api/gemini/analyze:", error);
    res.status(500).json({ error: error.message || "Failed to contact Gemini AI services." });
  }
});

// Secure route to generate AI-assisted insights and executive summary
app.post("/api/gemini/insights", async (req, res) => {
  try {
    const { stats, currentUserRole } = req.body;
    
    const ai = getAiClient();
    const prompt = `
You are the Executive Consultant to the Thulamela Municipal Manager.
Review the following high-level CRM performance statistics:
${JSON.stringify(stats, null, 2)}

Provide strategic, professional, data-driven dashboard insights for the user with role: ${currentUserRole || "Municipal Administrator"}.
Return your response in a valid JSON format containing:
1. "headline": A highly professional, bold summary headline.
2. "criticalAlert": A warning or notice about any critical blockages (e.g., bottleneck departments, high unresolved counts in specific wards), or a praise if everything is on track.
3. "recommendations": An array of 3 distinct, highly specific action items for the municipality to optimize service delivery.
4. "outlook": A brief trend prediction or strategic vision statement.

Ensure response is valid JSON with no markdown wrapping.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
    });

    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    let result;
    try {
      result = JSON.parse(cleanJson);
    } catch (parseErr) {
      result = {
        headline: "CRM Operational Overview Active",
        criticalAlert: "Systems operational. Monitor unresolved complaints closely to maintain SLA targets.",
        recommendations: [
          "Establish high priority response squad for Ward 35 & 10 water complaints.",
          "Reallocate field staff to bottleneck departments.",
          "Implement automatic follow-ups for complaints outstanding over 72 hours."
        ],
        outlook: "Service delivery expected to stabilize with current technician workloads."
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error in Gemini API route /api/gemini/insights:", error);
    res.status(500).json({ error: error.message || "Failed to contact Gemini AI services." });
  }
});

// Secure route to generate professional resolution text for technicians or administrators
app.post("/api/gemini/resolution", async (req, res) => {
  try {
    const { complaint, workDone, materialsUsed } = req.body;
    
    if (!complaint) {
      return res.status(400).json({ error: "Complaint data is required." });
    }

    const ai = getAiClient();
    const prompt = `
Generate a highly professional technical resolution summary for a completed repair.
Complaint Title: "${complaint.title}"
Citizen Description: "${complaint.description}"
Category: "${complaint.category}" / Sub-category: "${complaint.subCategory}"
Field Work Performed: "${workDone || "Standard maintenance and inspection completed"}"
Materials & Assets Used: "${materialsUsed || "Standard tools used"}"

Draft a clear, concise, and structured official municipal resolution text. It should sound highly professional, and be suitable to be sent to the Ward Councillor and the reporting citizen as an SMS/Email closure notice.
Return your response as a JSON object:
{ "resolutionNotes": "Your generated technical text", "citizenMessage": "Concise SMS update to the citizen" }
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt],
    });

    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    let result;
    try {
      result = JSON.parse(cleanJson);
    } catch (parseErr) {
      result = {
        resolutionNotes: `Work completed successfully: ${workDone}. Materials: ${materialsUsed}.`,
        citizenMessage: `Thulamela Municipality: We are pleased to inform you that your complaint regarding "${complaint.title}" has been successfully resolved.`
      };
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error in Gemini API route /api/gemini/resolution:", error);
    res.status(500).json({ error: error.message || "Failed to generate resolution text." });
  }
});

// Automatic account syncing & provisioning on server startup
async function autoProvisionAuthUsers() {
  try {
    ensureFirebaseInitialized();
    if (!isFirebaseInitialized) {
      console.log("[AUTH PROVISION]: Firebase is not initialized. Skipping automatic account linking.");
      return;
    }

    console.log("[AUTH PROVISION]: Scanning Firestore users collection for account linking...");
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    const usersSnap = await adminDb.collection("users").get();
    if (usersSnap.empty) {
      console.log("[AUTH PROVISION]: Firestore 'users' collection is empty. Skipping account linking.");
      return;
    }

    console.log(`[AUTH PROVISION]: Found ${usersSnap.size} Firestore users. Verifying Authentication synchronization...`);
    let synced = 0;
    let provisioned = 0;

    const devUsernames = ["superadmin", "munadmin", "cllr1", "cllr2", "cllr5", "tech1", "tech2"];

    for (const userDoc of usersSnap.docs) {
      const u = userDoc.data();
      const email = u.email;
      if (!email) continue;

      const normalizedEmail = email.trim().toLowerCase();
      const username = (u.username || "").trim().toLowerCase();
      const isDevUser = devUsernames.includes(username);

      let existingUser: any = null;
      try {
        existingUser = await adminAuth.getUserByEmail(normalizedEmail);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found" && !err.message?.includes("user-not-found")) {
          console.error(`[AUTH PROVISION ERROR]: Failed checking email ${email}:`, err);
          continue;
        }
      }

      if (existingUser) {
        // Account exists
        if (isDevUser) {
          // Keep development password in sync for ease of development testing
          await adminAuth.updateUser(existingUser.uid, {
            password: "Thulamela@2026"
          });
          console.log(`[AUTH PROVISION]: Updated existing development user "${username}" (${normalizedEmail}) password to Thulamela@2026`);
        } else {
          console.log(`[AUTH PROVISION]: Account already exists for "${username}" (${normalizedEmail}), left untouched.`);
        }
        synced++;
      } else {
        // Account is missing, securely create it with matching UID
        const password = isDevUser ? "Thulamela@2026" : (crypto.randomBytes(16).toString("hex") + "Thul@2026!");
        await adminAuth.createUser({
          uid: userDoc.id,
          email: normalizedEmail,
          password: password,
          displayName: u.name || u.username || "Thulamela User"
        });

        console.log(`[AUTH PROVISION]: Created missing Auth user for "${username}" (${normalizedEmail}) with matching UID ${userDoc.id}`);
        provisioned++;
      }
    }

    console.log(`[AUTH PROVISION COMPLETE]: Checked ${usersSnap.size} users. Synced/Updated: ${synced}, Provisioned: ${provisioned}`);
  } catch (err: any) {
    console.warn("[AUTH PROVISION SKIP]: Skipping auto-provision (likely local/unauthorized environment):", err.message);
  }
}

// Vite middleware for development or Static Asset serving for production
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Run auth provisioning asynchronously on start
    autoProvisionAuthUsers().catch(err => {
      console.warn("Failed executing background auth provisioning:", err);
    });
  });
}

start().catch((err) => {
  console.error("Error starting municipal server:", err);
});
