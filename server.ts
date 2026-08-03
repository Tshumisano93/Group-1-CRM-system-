import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getApps, initializeApp as initAdminApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import crypto from "crypto";

// Process level safety guards
process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception caught safely:", err?.message || err);
});

process.on("unhandledRejection", (reason: any) => {
  console.error("[SERVER] Unhandled Rejection caught safely:", reason?.message || reason);
});

console.log("Thulamela CRM server starting...");
dotenv.config();
console.log("Environment loaded");

let adminApp: any = null;
let isFirebaseInitialized = false;
let firebaseInitReason: string | null = null;

function initializeFirebaseSafely(): boolean {
  if (isFirebaseInitialized) return true;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      adminApp = existingApps[0];
      isFirebaseInitialized = true;
      console.log("Firebase Admin initialized");
      console.log("Firestore connection initialized");
      return true;
    }

    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    let firebaseConfig: any = {};
    if (fs.existsSync(configPath)) {
      try {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch (err: any) {
        console.warn("Failed to parse firebase-applet-config.json:", err.message);
      }
    }

    if (firebaseConfig.projectId) {
      adminApp = initAdminApp({
        projectId: firebaseConfig.projectId
      });
      isFirebaseInitialized = true;
      console.log("Firebase Admin initialized");
      console.log("Firestore connection initialized");
      return true;
    } else {
      adminApp = initAdminApp();
      isFirebaseInitialized = true;
      console.log("Firebase Admin initialized");
      console.log("Firestore connection initialized");
      return true;
    }
  } catch (err: any) {
    isFirebaseInitialized = false;
    firebaseInitReason = err?.message || String(err);
    console.warn("Firebase Admin unavailable — running in limited development mode.");
    console.warn(`Reason: ${firebaseInitReason}`);
    return false;
  }
}

function getFirebaseConfigSafely(): any {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (err) {
      return {};
    }
  }
  return {};
}

function getAdminDb() {
  initializeFirebaseSafely();
  if (!isFirebaseInitialized || !adminApp) {
    throw new Error(`Firebase Admin SDK is unavailable. (${firebaseInitReason || "Not initialized"})`);
  }
  const firebaseConfig = getFirebaseConfigSafely();
  return firebaseConfig.firestoreDatabaseId
    ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(adminApp);
}

function getAdminAuth() {
  initializeFirebaseSafely();
  if (!isFirebaseInitialized || !adminApp) {
    throw new Error(`Firebase Admin SDK is unavailable. (${firebaseInitReason || "Not initialized"})`);
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

// Resolve a user profile from Firestore by username, email, employeeNumber, or ID
app.post("/api/auth/resolve-user", async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: "Identifier is required." });
    }

    const norm = identifier.trim().toLowerCase().replace(/\s+/g, "");

    try {
      const dbInstance = getAdminDb();
      const usersRef = dbInstance.collection("users");

      let snapshot = await usersRef.where("username", "==", norm).get();
      if (snapshot.empty) {
        snapshot = await usersRef.where("email", "==", norm).get();
      }
      if (snapshot.empty) {
        snapshot = await usersRef.where("employeeNumber", "==", norm).get();
      }
      if (snapshot.empty) {
        const docById = await usersRef.doc(identifier.trim()).get();
        if (docById.exists) {
          return res.json({ user: docById.data() });
        }
      }

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0].data();
        return res.json({ user: userDoc });
      }
    } catch (dbErr: any) {
      console.warn("Firestore lookup failed during user resolution:", dbErr.message);
    }

    return res.json({ user: null });
  } catch (err: any) {
    console.warn("User resolution failed:", err.message);
    return res.json({ user: null, error: err.message });
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

    let callerDoc = await getAdminDb().collection("users").doc(callerUid).get();
    let callerData: any = null;

    if (callerDoc.exists) {
      callerData = callerDoc.data();
    } else {
      // Fallback: search Firestore user by email if UID doc is not yet linked
      const callerAuthUser = await getAdminAuth().getUser(callerUid);
      if (callerAuthUser.email) {
        const snap = await getAdminDb().collection("users").where("email", "==", callerAuthUser.email.toLowerCase()).get();
        if (!snap.empty) {
          callerData = snap.docs[0].data();
          // Auto-heal mapping to callerUid
          await getAdminDb().collection("users").doc(callerUid).set({
            ...callerData,
            id: callerUid
          }, { merge: true });
        }
      }
    }

    if (!callerData) {
      res.status(403).json({ error: "Access denied. Admin profile not found in database." });
      return null;
    }

    if (callerData.role !== "super_admin" && callerData.role !== "municipal_admin" && callerData.role !== "sub_admin") {
      res.status(403).json({ error: "Access denied. Administrative or Sub-Admin privileges required." });
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

    let {
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
      departmentId,
      departmentName,
      profilePicture
    } = req.body;

    if (!email || !password || !name || !username || !role) {
      return res.status(400).json({ error: "Mandatory fields: email, password, name, username, and role are required." });
    }

    const validRoles = ["super_admin", "municipal_admin", "technician", "councillor", "sub_admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role specified: "${role}".` });
    }

    // Role safety & permissions
    if (caller.role === "sub_admin") {
      if (role !== "technician") {
        return res.status(403).json({ error: "Access denied. Sub-Administrators can only provision Technician accounts." });
      }
      // Enforce department match for Sub-Admin
      departmentId = caller.departmentId || departmentId;
      departmentName = caller.departmentName || departmentName;
    } else if (caller.role === "municipal_admin") {
      if (role === "super_admin" || role === "municipal_admin") {
        return res.status(403).json({ error: "Access denied. Only Super Administrators can provision administrative accounts." });
      }
    }

    if (role === "sub_admin" && !departmentId) {
      return res.status(400).json({ error: "A Sub-Admin must be assigned to a specific municipal department." });
    }

    if (role === "technician" && !departmentId) {
      return res.status(400).json({ error: "A Technician must be assigned to a specific municipal department." });
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
      departmentId: departmentId || null,
      departmentName: departmentName || null,
      status: "active",
      profilePicture: (profilePicture || "").trim() || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
      dateCreated: new Date().toISOString()
    };

    await getAdminDb().collection("users").doc(authUser.uid).set(newUser);

    // 3. If role === technician, create record in technicians collection
    if (role === "technician") {
      const newTechDoc = {
        id: authUser.uid,
        name: name.trim(),
        departmentId: departmentId || "",
        departmentName: departmentName || "",
        phone: (phone || "").trim(),
        email: email.trim().toLowerCase(),
        status: "available",
        activeTasks: 0,
        completedTasks: 0
      };
      await getAdminDb().collection("technicians").doc(authUser.uid).set(newTechDoc);
    }

    console.log(`Secured account provisioned successfully: ${email} UID: ${authUser.uid}`);

    res.json({ uid: authUser.uid, user: newUser, message: "User provisioned successfully." });
  } catch (err: any) {
    console.error("User creation failed:", err);
    res.status(500).json({ error: err.message || "An unexpected error occurred during user provisioning." });
  }
});

// Secure Toggle User Status Route
app.post("/api/admin/users/toggle-status", async (req, res) => {
  try {
    const caller = await verifyAdminCaller(req, res);
    if (!caller) return; // Response sent in helper

    const { userId, currentStatus } = req.body;
    if (!userId || !currentStatus) {
      return res.status(400).json({ error: "Missing required fields: userId and currentStatus." });
    }

    const targetUserDoc = await getAdminDb().collection("users").doc(userId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ error: "Target user account not found." });
    }
    const targetUser = targetUserDoc.data();

    if (caller.role === "sub_admin") {
      if (targetUser?.role !== "technician" || targetUser?.departmentId !== caller.departmentId) {
        return res.status(403).json({ error: "Access denied. Sub-Administrators can only modify technicians in their own department." });
      }
    } else if (caller.role === "municipal_admin") {
      if (targetUser?.role === "super_admin") {
        return res.status(403).json({ error: "Access denied. Municipal Administrators cannot alter Super Admin account status." });
      }
    }

    const nextStatus = (currentStatus === "active" || currentStatus === "available" || currentStatus === "busy") ? "inactive" : "active";

    // 1. Update in Firebase Authentication (disable / enable user)
    try {
      await getAdminAuth().updateUser(userId, {
        disabled: nextStatus === "inactive"
      });
    } catch (authErr: any) {
      console.warn("Firebase Auth status update skipped/warning:", authErr.message);
    }

    // 2. Update in Firestore profile
    await getAdminDb().collection("users").doc(userId).update({
      status: nextStatus
    });

    // 3. If target is technician, update technician document status if applicable
    if (targetUser?.role === "technician") {
      try {
        await getAdminDb().collection("technicians").doc(userId).update({
          status: nextStatus === "inactive" ? "on_leave" : "available"
        });
      } catch (techErr: any) {
        console.warn("Technician document status update warning:", techErr.message);
      }
    }

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
    if (!initializeFirebaseSafely()) {
      console.log("[AUTH PROVISION]: Firebase Admin unavailable. Skipping automatic account linking.");
      return;
    }

    console.log("[AUTH PROVISION]: Auditing Firebase Authentication and Firestore users synchronization...");
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    const defaultSeedUsers = [
      {
        id: "ADMIN-001",
        name: "Thilivhali Mulaudzi",
        email: "admin@thulamela.gov.za",
        phone: "015 962 7500",
        physicalAddress: "Thohoyandou Civic Centre, Limpopo",
        username: "superadmin",
        role: "super_admin",
        employeeNumber: "EMP-SA-001",
        saIdNumber: "8504125896084",
        status: "active",
        profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
        dateCreated: "2025-01-10T08:00:00Z"
      },
      {
        id: "ADMIN-002",
        name: "Tshifhiwa Nekhavhambe",
        email: "t.nekhavhambe@thulamela.gov.za",
        phone: "015 962 7501",
        physicalAddress: "Thohoyandou Civic Centre, Limpopo",
        username: "munadmin",
        role: "municipal_admin",
        employeeNumber: "EMP-MA-002",
        saIdNumber: "8911055678083",
        status: "active",
        profilePicture: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        dateCreated: "2025-01-15T09:30:00Z"
      },
      {
        id: "COUN-001",
        name: "Cllr Azwihangwisi Radzilani",
        email: "a.radzilani@thulamela.gov.za",
        phone: "082 123 4567",
        physicalAddress: "124 Makwarela Ext, Thohoyandou",
        username: "cllr1",
        role: "councillor",
        wardNumber: 1,
        wardName: "Makwarela",
        employeeNumber: "EMP-CLLR-001",
        saIdNumber: "7811225893081",
        politicalPosition: "ANC Ward Councillor",
        status: "active",
        profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
        dateCreated: "2025-02-01T10:00:00Z"
      },
      {
        id: "COUN-002",
        name: "Cllr Mulatedzi Nemudzivhadi",
        email: "m.nemudzivhadi@thulamela.gov.za",
        phone: "083 456 7890",
        physicalAddress: "45 Sibasa Main Rd, Sibasa",
        username: "cllr2",
        role: "councillor",
        wardNumber: 2,
        wardName: "Sibasa",
        employeeNumber: "EMP-CLLR-002",
        saIdNumber: "8205145781082",
        politicalPosition: "ANC Ward Councillor",
        status: "active",
        profilePicture: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
        dateCreated: "2025-02-01T10:30:00Z"
      },
      {
        id: "TECH-001",
        name: "Vhonani Mapholi",
        email: "v.mapholi@thulamela.gov.za",
        phone: "072 111 2222",
        physicalAddress: "Thulamela Depot, Sibasa",
        username: "tech1",
        role: "technician",
        status: "active",
        profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
        dateCreated: "2025-02-05T08:00:00Z"
      }
    ];

    // Seed default user documents in Firestore first if missing
    for (const seedUser of defaultSeedUsers) {
      try {
        const docRef = adminDb.collection("users").doc(seedUser.id);
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
          await docRef.set(seedUser);
          console.log(`[AUTH PROVISION]: Seeded default Firestore user document for "${seedUser.username}" (${seedUser.email})`);
        }
      } catch (seedErr: any) {
        console.warn(`[AUTH PROVISION WARN]: Could not seed Firestore document for ${seedUser.username}:`, seedErr.message);
      }
    }

    const usersSnap = await adminDb.collection("users").get();
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

      let existingAuthUser: any = null;
      try {
        existingAuthUser = await adminAuth.getUserByEmail(normalizedEmail);
      } catch (err: any) {
        if (err.code !== "auth/user-not-found" && !err.message?.includes("user-not-found")) {
          console.error(`[AUTH PROVISION ERROR]: Failed checking email ${email}:`, err.message || err);
          continue;
        }
      }

      if (existingAuthUser) {
        // Account exists in Firebase Auth!
        // DO NOT reset or overwrite password for existing users.
        if (existingAuthUser.disabled || !existingAuthUser.emailVerified) {
          await adminAuth.updateUser(existingAuthUser.uid, {
            emailVerified: true,
            disabled: false
          });
          console.log(`[AUTH PROVISION]: Ensured account status active & emailVerified for "${username}" (${normalizedEmail})`);
        }

        // Map Firebase Auth UID to Firestore document users/{existingAuthUser.uid}
        const authUidDocRef = adminDb.collection("users").doc(existingAuthUser.uid);
        const authUidDocSnap = await authUidDocRef.get();

        if (!authUidDocSnap.exists) {
          await authUidDocRef.set({
            ...u,
            id: existingAuthUser.uid,
            status: "active"
          }, { merge: true });
          console.log(`[AUTH PROVISION]: Linked Firestore profile users/${existingAuthUser.uid} for "${username}" (${normalizedEmail})`);
        } else {
          if (authUidDocSnap.data()?.status !== "active") {
            await authUidDocRef.update({ status: "active" });
          }
        }

        if (userDoc.id !== existingAuthUser.uid) {
          await userDoc.ref.update({ status: "active" });
        }
        synced++;
      } else {
        // Account missing in Auth -> Create missing Auth user securely
        const defaultPassword = isDevUser ? "Thulamela@2026" : (crypto.randomBytes(16).toString("hex") + "Thul@2026!");
        const newAuthUser = await adminAuth.createUser({
          uid: userDoc.id,
          email: normalizedEmail,
          password: defaultPassword,
          displayName: u.name || u.username || "Thulamela User",
          emailVerified: true,
          disabled: false
        });

        // Ensure Firestore profile exists at newAuthUser.uid
        await adminDb.collection("users").doc(newAuthUser.uid).set({
          ...u,
          id: newAuthUser.uid,
          status: "active"
        }, { merge: true });

        console.log(`[AUTH PROVISION]: Created missing Auth user & linked Firestore profile for "${username}" (${normalizedEmail}) with UID ${newAuthUser.uid}`);
        provisioned++;
      }
    }

    // Inverse check: ensure all Auth users have corresponding Firestore documents
    try {
      const listUsersResult = await adminAuth.listUsers(1000);
      for (const authUser of listUsersResult.users) {
        if (!authUser.email) continue;
        const authDocRef = adminDb.collection("users").doc(authUser.uid);
        const authDocSnap = await authDocRef.get();
        if (!authDocSnap.exists) {
          const emailSnap = await adminDb.collection("users").where("email", "==", authUser.email.toLowerCase()).get();
          if (!emailSnap.empty) {
            const foundData = emailSnap.docs[0].data();
            await authDocRef.set({
              ...foundData,
              id: authUser.uid,
              status: "active"
            }, { merge: true });
            console.log(`[AUTH PROVISION]: Linked existing Auth user ${authUser.email} (${authUser.uid}) to Firestore profile`);
          } else {
            await authDocRef.set({
              id: authUser.uid,
              name: authUser.displayName || authUser.email.split("@")[0],
              email: authUser.email,
              username: authUser.email.split("@")[0],
              role: "municipal_admin",
              status: "active",
              dateCreated: new Date().toISOString()
            });
            console.log(`[AUTH PROVISION]: Created Firestore profile for Auth user ${authUser.email} (${authUser.uid})`);
          }
        }
      }
    } catch (listErr: any) {
      console.warn("[AUTH PROVISION WARN]: Could not list Auth users for inverse check:", listErr.message);
    }

    console.log(`[AUTH PROVISION COMPLETE]: Checked users. Synced: ${synced}, Provisioned: ${provisioned}`);
  } catch (err: any) {
    console.warn("[AUTH PROVISION SKIP]: Skipping auto-provision (likely local/unauthorized environment):", err.message);
  }
}

// Vite middleware for development or Static Asset serving for production
async function start() {
  console.log("Express server initialized");
  console.log("API routes registered");

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
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
    console.log(`Server listening on port ${PORT}`);
    // Run Firebase initialization & auth provisioning safely in background after Express server is listening
    setTimeout(() => {
      try {
        initializeFirebaseSafely();
        autoProvisionAuthUsers().catch(err => {
          console.warn("Failed executing background auth provisioning:", err?.message || err);
        });
      } catch (err: any) {
        console.warn("Background Firebase startup task error caught safely:", err?.message || err);
      }
    }, 100);
  });
}

start().catch((err) => {
  console.error("Error starting municipal server:", err);
});
