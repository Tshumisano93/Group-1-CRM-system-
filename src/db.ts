import { User, Ward, Department, Technician, Complaint, Notification, Announcement, AuditLog, UserRole, ChatMessage, ChatRoom, CalendarEvent, Task, MunicipalDocument, DigitalForm, AccountRequest, ServiceNotice } from "./types";
import { SEED_WARDS, DEPARTMENTS, SEED_TECHNICIANS, SEED_USERS, SEED_COMPLAINTS, ANNOUNCEMENTS, SEED_SERVICE_NOTICES } from "./data";
import { isFirebaseEnabled, db, auth, storage } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { deleteObject, ref } from "firebase/storage";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  writeBatch,
  where,
  limit,
  deleteDoc
} from "firebase/firestore";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);

  const isWebChannelTransportError = 
    errMsg.includes("WebChannel") ||
    errMsg.includes("listenStream") ||
    errMsg.includes("transport error") ||
    errMsg.includes("UNAVAILABLE") ||
    errMsg.includes("Could not reach Cloud Firestore");

  if (isWebChannelTransportError) {
    console.debug(`[FIRESTORE TRANSPORT]: Transient WebChannel reconnect on collection '${path}':`, errMsg);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };

  const isPermissionError = 
    errMsg.includes("permission") || 
    errMsg.includes("Permission") || 
    errMsg.includes("insufficient") ||
    errMsg.includes("unauthenticated") ||
    errMsg.includes("auth/");

  if (isPermissionError) {
    console.warn("Firestore Security Warning: ", JSON.stringify(errInfo));
  } else {
    console.error("Firestore Error: ", JSON.stringify(errInfo));
  }

  if (operationType !== OperationType.LIST) {
    throw new Error(JSON.stringify(errInfo));
  }
}

let syncStatus: "synced" | "syncing" | "offline" = "offline";

export function getSyncStatus() {
  return syncStatus;
}

export const isDemoMode = (() => {
  if (typeof process !== "undefined" && process.env?.NODE_ENV !== "production") return true;
  if (typeof import.meta !== "undefined" && (import.meta.env?.DEV || import.meta.env?.MODE === "development")) return true;
  if (typeof window !== "undefined") {
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.href.includes("-dev-")) {
      return true;
    }
  }
  return false;
})();

export function initializeDb() {
  // 1. Setup local storage seeding first so app works instantly
  let currentUsers: any[] = [];
  try {
    currentUsers = JSON.parse(localStorage.getItem("thulamela_crm_users") || "[]");
  } catch (e) {
    currentUsers = [];
  }
  if (!Array.isArray(currentUsers) || currentUsers.length === 0) {
    if (isDemoMode) {
      localStorage.setItem("thulamela_crm_users", JSON.stringify(SEED_USERS));
    } else {
      localStorage.setItem("thulamela_crm_users", JSON.stringify([]));
    }
  } else {
    const userMap = new Map<string, User>();
    // Ensure foundation is SEED_USERS if in demo mode
    if (isDemoMode) {
      SEED_USERS.forEach(u => userMap.set(u.id, u));
    }
    // Keep or update any custom fields/creations
    currentUsers.forEach((u: any) => {
      if (u && u.id) {
        userMap.set(u.id, { ...userMap.get(u.id), ...u });
      }
    });
    localStorage.setItem("thulamela_crm_users", JSON.stringify(Array.from(userMap.values())));
  }
  if (!localStorage.getItem("thulamela_crm_wards")) {
    localStorage.setItem("thulamela_crm_wards", JSON.stringify(SEED_WARDS));
  }
  if (!localStorage.getItem("thulamela_crm_departments")) {
    localStorage.setItem("thulamela_crm_departments", JSON.stringify(DEPARTMENTS));
  }
  if (!localStorage.getItem("thulamela_crm_technicians")) {
    localStorage.setItem("thulamela_crm_technicians", JSON.stringify(SEED_TECHNICIANS));
  }
  if (!localStorage.getItem("thulamela_crm_complaints")) {
    localStorage.setItem("thulamela_crm_complaints", JSON.stringify(SEED_COMPLAINTS));
  }
  if (!localStorage.getItem("thulamela_crm_announcements")) {
    localStorage.setItem("thulamela_crm_announcements", JSON.stringify(ANNOUNCEMENTS));
  }
  
  if (!localStorage.getItem("thulamela_crm_notifications")) {
    const initialNotifications: Notification[] = [
      {
        id: "notif-1",
        userId: "COUN-001",
        title: "Complaint COMP-1001 Resolved",
        message: "Your reported water outage complaint at Makwarela Block F has been marked as Resolved by Technician Vhonani Mapholi.",
        type: "success",
        isRead: false,
        timestamp: "2026-07-04T15:25:00Z",
        complaintId: "COMP-1001"
      },
      {
        id: "notif-2",
        userId: "all",
        role: "councillor",
        title: "IDP Community Consultation Form Scheduled",
        message: "A new municipal IDP consultation forum has been scheduled. Check announcements to coordinate with your community members.",
        type: "info",
        isRead: false,
        timestamp: "2026-07-09T08:00:00Z"
      }
    ];
    localStorage.setItem("thulamela_crm_notifications", JSON.stringify(initialNotifications));
  }

  if (!localStorage.getItem("thulamela_crm_audit_logs")) {
    const initialAuditLogs: AuditLog[] = [
      {
        id: "audit-1",
        timestamp: "2026-07-01T08:00:00Z",
        userId: "SYSTEM",
        userName: "System Initialization",
        userRole: "super_admin",
        action: "Database Initialized",
        details: "Thulamela Municipality CRM Database bootstrapped with seed data, 41 wards, 6 departments, and default user accounts."
      }
    ];
    localStorage.setItem("thulamela_crm_audit_logs", JSON.stringify(initialAuditLogs));
  }

  // Seed advanced features
  if (!localStorage.getItem("thulamela_crm_chat_rooms")) {
    const initialRooms: ChatRoom[] = [
      { id: "room-all-admin-councillor", name: "General Assembly (Admin & Councillors)", type: "group", participants: ["ADMIN-001", "COUN-001", "COUN-002", "TECH-201"] },
      { id: "room-dept-water", name: "Water Services Department Chat", type: "group", participants: ["ADMIN-001", "COUN-001", "TECH-201"], departmentId: "WATER" },
      { id: "room-dept-elec", name: "Electricity & Energy Department Chat", type: "group", participants: ["ADMIN-001", "COUN-002", "TECH-202"], departmentId: "ELEC" },
      { id: "room-broadcast", name: "Municipal Executive Broadcasts", type: "broadcast", participants: ["ADMIN-001", "COUN-001", "COUN-002", "TECH-201", "TECH-202"] }
    ];
    localStorage.setItem("thulamela_crm_chat_rooms", JSON.stringify(initialRooms));
  }

  if (!localStorage.getItem("thulamela_crm_chat_messages")) {
    const initialMessages: ChatMessage[] = [
      { id: "msg-1", roomId: "room-all-admin-councillor", senderId: "ADMIN-001", senderName: "Sikhumbuzo Ndlovu", senderRole: "super_admin", message: "Good morning Ward Councillors. Please submit all pending IDP ward validation reports by this afternoon.", timestamp: "2026-07-09T08:15:00Z", readBy: ["ADMIN-001", "COUN-001"] },
      { id: "msg-2", roomId: "room-all-admin-councillor", senderId: "COUN-001", senderName: "Mashudu Nemadzivhanani", senderRole: "councillor", message: "Understood, Super Admin. Ward 15's report is being finalized right now.", timestamp: "2026-07-09T08:22:00Z", readBy: ["ADMIN-001", "COUN-001"] },
      { id: "msg-3", roomId: "room-dept-water", senderId: "TECH-201", senderName: "Vhonani Mapholi", senderRole: "technician", message: "Sewer pipe blockage cleared at Makwarela. Requesting Councillor Nemadzivhanani to verify the site.", timestamp: "2026-07-09T14:30:00Z", readBy: ["COUN-001", "TECH-201"] }
    ];
    localStorage.setItem("thulamela_crm_chat_messages", JSON.stringify(initialMessages));
  }

  if (!localStorage.getItem("thulamela_crm_calendar_events")) {
    const initialEvents: CalendarEvent[] = [
      { id: "event-1", title: "Makwarela Reservoir Inspection", description: "Routine structural inspection of main storage reservoirs with water engineers.", type: "inspection", startDate: "2026-07-11T09:00:00.000Z", endDate: "2026-07-11T12:00:00.000Z", location: "Makwarela Reservoir Block B", assignedUserId: "TECH-201", wardNumber: 15, complaintId: "COMP-1001" },
      { id: "event-2", title: "Ward 15 Community Feedback Forum", description: "Cllr Nemadzivhanani meeting with residents regarding waste removal frequency and water updates.", type: "community_meeting", startDate: "2026-07-12T14:00:00.000Z", endDate: "2026-07-12T17:00:00.000Z", location: "Makwarela Community Hall", assignedUserId: "COUN-001", wardNumber: 15 }
    ];
    localStorage.setItem("thulamela_crm_calendar_events", JSON.stringify(initialEvents));
  }

  if (!localStorage.getItem("thulamela_crm_tasks")) {
    const initialTasks: Task[] = [
      { id: "TSK-1001", title: "Makwarela Block F Leak Verification", description: "Conduct pressure tests on newly fitted pipelines at Makwarela Block F.", assignedUserId: "TECH-201", assignedUserName: "Vhonani Mapholi", departmentId: "WATER", priority: "High", status: "In Progress", startDate: "2026-07-10T08:00:00.000Z", dueDate: "2026-07-12T17:00:00.000Z", progressPercentage: 45, attachments: [], comments: [] },
      { id: "TSK-1002", title: "Transformer Repair at Sibasa Ward 12", description: "Replace damaged copper wiring in the primary substation feeder box.", assignedUserId: "TECH-202", assignedUserName: "Lufuno Singo", departmentId: "ELEC", priority: "Critical", status: "Pending", startDate: "2026-07-10T08:00:00.000Z", dueDate: "2026-07-11T12:00:00.000Z", progressPercentage: 0, attachments: [], comments: [] }
    ];
    localStorage.setItem("thulamela_crm_tasks", JSON.stringify(initialTasks));
  }

  if (!localStorage.getItem("thulamela_crm_documents")) {
    const initialDocs: MunicipalDocument[] = [
      { id: "doc-1", title: "Integrated Development Plan (IDP) 2026-2031", category: "policies", fileUrl: "https://www.thulamela.gov.za/documents/IDP_2026.pdf", fileType: "pdf", fileSize: "4.2 MB", version: 1, uploadedBy: "ADMIN-001", uploadedByName: "Sikhumbuzo Ndlovu", uploadedDate: "2026-06-15T10:00:00.000Z" },
      { id: "doc-2", title: "SOP for Water Burst Pipeline Isolation", category: "training", fileUrl: "https://www.thulamela.gov.za/documents/SOP_Water.pdf", fileType: "pdf", fileSize: "1.8 MB", version: 2, uploadedBy: "ADMIN-001", uploadedByName: "Sikhumbuzo Ndlovu", uploadedDate: "2026-07-02T11:30:00.000Z" }
    ];
    localStorage.setItem("thulamela_crm_documents", JSON.stringify(initialDocs));
  }

  if (!localStorage.getItem("thulamela_crm_digital_forms")) {
    const initialForms: DigitalForm[] = [
      { id: "form-1", type: "site_visit", title: "Site Inspection: Pipeline Burst Block F", formData: { "inspector": "Vhonani Mapholi", "leakSeverity": "Severe", "materialsUsed": "Gasket, Clamp, 2m PVC pipe", "laborHours": "3 hours" }, gpsCoordinates: "-22.9567, 30.4812", submittedBy: "TECH-201", submittedByName: "Vhonani Mapholi", date: "2026-07-09T15:30:00.000Z", isDraft: false }
    ];
    localStorage.setItem("thulamela_crm_digital_forms", JSON.stringify(initialForms));
  }

  if (!localStorage.getItem("thulamela_crm_service_notices") || localStorage.getItem("thulamela_crm_service_notices") === "[]") {
    localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(SEED_SERVICE_NOTICES));
  }

  // 2. If Firebase is enabled, kick off Firestore background sync & real-time listeners
  if (isFirebaseEnabled && db && auth) {
    syncStatus = "syncing";
    triggerDbUpdateEvent();
    
    const startSync = async () => {
      try {
        if (!auth.currentUser) {
          console.log("Signing in anonymously to Firebase Auth...");
          await signInAnonymously(auth);
        }
        await setupFirestoreListenersAndSync();
        syncStatus = "synced";
        triggerDbUpdateEvent();
        console.log("Firestore sync & listeners successfully attached!");
      } catch (err) {
        syncStatus = "offline";
        triggerDbUpdateEvent();
        console.warn("Firestore sync initialization paused (user may be offline or unauthenticated):", err);
      }
    };

    startSync();
  } else {
    syncStatus = "offline";
    triggerDbUpdateEvent();
  }
}

// Custom trigger event to notify active views to refresh instantly
function triggerDbUpdateEvent() {
  window.dispatchEvent(new Event("thulamela_db_update"));
}

const ADMIN_ONLY_SEED_COLLECTIONS = new Set([
  "users",
  "wards",
  "departments",
  "technicians",
  "announcements",
  "serviceNotices"
]);

const completedSeedChecks = new Set<string>();
let activeSnapshotUnsubscribes: (() => void)[] = [];
let listenersInitialized = false;

export function isCurrentAdmin(): boolean {
  const currentUser = getCurrentUser();
  if (!currentUser) return false;
  return currentUser.role === "super_admin" || currentUser.role === "municipal_admin";
}

export function cleanupFirestoreListeners() {
  if (activeSnapshotUnsubscribes.length > 0) {
    console.log(`[FIRESTORE]: Cleaning up ${activeSnapshotUnsubscribes.length} active snapshot listeners...`);
    activeSnapshotUnsubscribes.forEach(unsub => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    activeSnapshotUnsubscribes = [];
  }
  listenersInitialized = false;
}

export async function triggerAdminSeedingIfAuthorized() {
  if (!isFirebaseEnabled || !db) return;
  if (!isCurrentAdmin()) return;

  // Admin session active, allow check for empty admin collections
  ADMIN_ONLY_SEED_COLLECTIONS.forEach(col => completedSeedChecks.delete(col));
  await runRoleAwareSeedChecks();
}

async function runRoleAwareSeedChecks() {
  if (!isFirebaseEnabled || !db) return;

  const isAdmin = isCurrentAdmin();

  const seedIfAllowed = async (collectionName: string, getLocalData: () => any[]) => {
    const isAdminOnly = ADMIN_ONLY_SEED_COLLECTIONS.has(collectionName);

    // If administrative write required and current user is not admin, skip silently
    if (isAdminOnly && !isAdmin) {
      if (!completedSeedChecks.has(collectionName)) {
        completedSeedChecks.add(collectionName);
        console.debug(`[SEED]: Skipped admin collection '${collectionName}' seed check — non-admin session.`);
      }
      return;
    }

    if (completedSeedChecks.has(collectionName)) return;
    completedSeedChecks.add(collectionName);

    try {
      const q = query(collection(db, collectionName), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        console.log(`[SEED]: Seeding empty Firestore collection '${collectionName}'...`);
        const data = getLocalData();
        if (data && data.length > 0) {
          const batch = writeBatch(db);
          data.forEach(item => {
            const docRef = doc(collection(db, collectionName), item.id || `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
            batch.set(docRef, item);
          });
          await batch.commit();
          console.log(`[SEED]: Successfully seeded collection '${collectionName}'.`);
        }
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes("permission") || errMsg.includes("insufficient")) {
        console.debug(`[SEED]: Seeding skipped for '${collectionName}' (insufficient permission).`);
      } else {
        console.warn(`[SEED]: Could not check/seed collection '${collectionName}':`, errMsg);
      }
    }
  };

  if (isDemoMode) {
    await seedIfAllowed("users", getUsers);
  }
  await seedIfAllowed("wards", getWards);
  await seedIfAllowed("departments", getDepartments);
  await seedIfAllowed("technicians", getTechnicians);
  await seedIfAllowed("complaints", getComplaints);
  await seedIfAllowed("announcements", getAnnouncements);
  await seedIfAllowed("notifications", getNotifications);
  await seedIfAllowed("auditLogs", getAuditLogs);
  await seedIfAllowed("serviceNotices", getServiceNotices);
}

// Background FireStore Real-Time Listener and Seeding Sync Manager
async function setupFirestoreListenersAndSync() {
  if (!isFirebaseEnabled || !db) return;

  // Prevent duplicate listener attachments
  if (listenersInitialized && activeSnapshotUnsubscribes.length > 0) {
    return;
  }

  cleanupFirestoreListeners();
  await runRoleAwareSeedChecks();

  listenersInitialized = true;

  // Setup Real-Time Listeners with tracked unsubscribes
  const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
    const firestoreUsers: User[] = [];
    snapshot.forEach(docSnap => {
      const u = docSnap.data() as any;
      if (u) {
        const userId = u.id || docSnap.id;
        const username = u.username || u.email?.split("@")[0] || docSnap.id.toLowerCase();
        const email = u.email || `${username}@thulamela.gov.za`;

        const mappedUser: User = {
          id: userId,
          name: u.name || "",
          email: email,
          phone: u.phone || "",
          physicalAddress: u.physicalAddress || "",
          username: username,
          role: u.role || (u.superAdmin === true || u.superAdmin === "true" ? "super_admin" : "municipal_admin"),
          employeeNumber: u.employeeNumber || "",
          saIdNumber: u.saIdNumber || u["AC ID number"] || u["saIdNumber"] || "",
          wardNumber: typeof u.wardNumber === "number" ? u.wardNumber : (u.wardNumber ? parseInt(u.wardNumber, 10) : undefined),
          wardName: u.wardName || "",
          politicalPosition: u.politicalPosition || "",
          profilePicture: u.profilePicture || "",
          status: u.status || (u.active === false || u.active === "false" ? "inactive" : "active"),
          dateCreated: u.dateCreated || new Date().toISOString(),
          tempPassword: u.tempPassword || "",
          mustChangePassword: u.mustChangePassword !== undefined ? !!u.mustChangePassword : false,
        };
        firestoreUsers.push(mappedUser);
      }
    });

    const userMap = new Map<string, User>();
    if (isDemoMode) {
      SEED_USERS.forEach(u => userMap.set(u.id, u));
    }
    try {
      const currentLocal = JSON.parse(localStorage.getItem("thulamela_crm_users") || "[]");
      if (Array.isArray(currentLocal)) {
        currentLocal.forEach((u: any) => {
          if (u && u.id) userMap.set(u.id, { ...userMap.get(u.id), ...u });
        });
      }
    } catch (e) {
      console.warn("Failed to parse current local users during snapshot merge:", e);
    }

    if (firestoreUsers.length > 0 || isDemoMode) {
      firestoreUsers.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), ...u }));
      const mergedList = Array.from(userMap.values());
      localStorage.setItem("thulamela_crm_users", JSON.stringify(mergedList));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "users");
  });
  activeSnapshotUnsubscribes.push(unsubUsers);

  const unsubComplaints = onSnapshot(collection(db, "complaints"), (snapshot) => {
    const list: Complaint[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Complaint));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_complaints", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "complaints");
  });
  activeSnapshotUnsubscribes.push(unsubComplaints);

  const unsubNotifications = onSnapshot(collection(db, "notifications"), (snapshot) => {
    const list: Notification[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Notification));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_notifications", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "notifications");
  });
  activeSnapshotUnsubscribes.push(unsubNotifications);

  const unsubAnnouncements = onSnapshot(collection(db, "announcements"), (snapshot) => {
    const list: Announcement[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Announcement));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_announcements", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "announcements");
  });
  activeSnapshotUnsubscribes.push(unsubAnnouncements);

  const unsubAuditLogs = onSnapshot(collection(db, "auditLogs"), (snapshot) => {
    const list: AuditLog[] = [];
    snapshot.forEach(doc => list.push(doc.data() as AuditLog));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_audit_logs", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "auditLogs");
  });
  activeSnapshotUnsubscribes.push(unsubAuditLogs);

  const unsubServiceNotices = onSnapshot(collection(db, "serviceNotices"), (snapshot) => {
    const list: ServiceNotice[] = [];
    snapshot.forEach(doc => list.push(doc.data() as ServiceNotice));
    localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(list));
    triggerDbUpdateEvent();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "serviceNotices");
  });
  activeSnapshotUnsubscribes.push(unsubServiceNotices);

  const unsubWards = onSnapshot(collection(db, "wards"), (snapshot) => {
    const list: Ward[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Ward));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_wards", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "wards"));
  activeSnapshotUnsubscribes.push(unsubWards);

  const unsubDepts = onSnapshot(collection(db, "departments"), (snapshot) => {
    const list: Department[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Department));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_departments", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "departments"));
  activeSnapshotUnsubscribes.push(unsubDepts);

  const unsubTechs = onSnapshot(collection(db, "technicians"), (snapshot) => {
    const list: Technician[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Technician));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_technicians", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "technicians"));
  activeSnapshotUnsubscribes.push(unsubTechs);

  const unsubChatMsgs = onSnapshot(collection(db, "chatMessages"), (snapshot) => {
    const list: ChatMessage[] = [];
    snapshot.forEach(doc => list.push(doc.data() as ChatMessage));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_chat_messages", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "chatMessages"));
  activeSnapshotUnsubscribes.push(unsubChatMsgs);

  const unsubChatRooms = onSnapshot(collection(db, "chatRooms"), (snapshot) => {
    const list: ChatRoom[] = [];
    snapshot.forEach(doc => list.push(doc.data() as ChatRoom));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_chat_rooms", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "chatRooms"));
  activeSnapshotUnsubscribes.push(unsubChatRooms);

  const unsubEvents = onSnapshot(collection(db, "calendarEvents"), (snapshot) => {
    const list: CalendarEvent[] = [];
    snapshot.forEach(doc => list.push(doc.data() as CalendarEvent));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_calendar_events", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "calendarEvents"));
  activeSnapshotUnsubscribes.push(unsubEvents);

  const unsubTasks = onSnapshot(collection(db, "tasks"), (snapshot) => {
    const list: Task[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Task));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_tasks", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "tasks"));
  activeSnapshotUnsubscribes.push(unsubTasks);

  const unsubDocs = onSnapshot(collection(db, "documents"), (snapshot) => {
    const list: MunicipalDocument[] = [];
    snapshot.forEach(doc => list.push(doc.data() as MunicipalDocument));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_documents", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "documents"));
  activeSnapshotUnsubscribes.push(unsubDocs);

  const unsubForms = onSnapshot(collection(db, "digitalForms"), (snapshot) => {
    const list: DigitalForm[] = [];
    snapshot.forEach(doc => list.push(doc.data() as DigitalForm));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_digital_forms", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => handleFirestoreError(error, OperationType.LIST, "digitalForms"));
  activeSnapshotUnsubscribes.push(unsubForms);
}

// Low-level Getters & Setters
export function getUsers(): User[] {
  let users: any[] = [];
  try {
    users = JSON.parse(localStorage.getItem("thulamela_crm_users") || "[]");
  } catch (e) {
    users = [];
  }
  
  const userMap = new Map<string, User>();
  if (isDemoMode) {
    SEED_USERS.forEach(u => userMap.set(u.id, u));
  }
  
  if (Array.isArray(users)) {
    users.forEach((u: any) => {
      if (u && u.id) {
        const username = u.username || u.email?.split("@")[0] || u.id.toLowerCase();
        const email = u.email || `${username}@thulamela.gov.za`;
        
        const mapped: User = {
          id: u.id,
          name: u.name || "",
          email: email,
          phone: u.phone || "",
          physicalAddress: u.physicalAddress || "",
          username: username,
          role: u.role || (u.superAdmin === true || u.superAdmin === "true" ? "super_admin" : "municipal_admin"),
          employeeNumber: u.employeeNumber || "",
          saIdNumber: u.saIdNumber || u["AC ID number"] || u["saIdNumber"] || "",
          wardNumber: typeof u.wardNumber === "number" ? u.wardNumber : (u.wardNumber ? parseInt(u.wardNumber, 10) : undefined),
          wardName: u.wardName || "",
          politicalPosition: u.politicalPosition || "",
          profilePicture: u.profilePicture || "",
          status: u.status || (u.active === false || u.active === "false" ? "inactive" : "active"),
          dateCreated: u.dateCreated || new Date().toISOString(),
          tempPassword: u.tempPassword || "",
          mustChangePassword: u.mustChangePassword !== undefined ? !!u.mustChangePassword : false,
        };
        userMap.set(u.id, { ...userMap.get(u.id), ...mapped });
      }
    });
  }
  
  return Array.from(userMap.values());
}

export function saveUsers(users: User[]) {
  localStorage.setItem("thulamela_crm_users", JSON.stringify(users));
  triggerDbUpdateEvent();
  // Sync to Firestore in background
  if (isFirebaseEnabled && db) {
    users.forEach(async (u) => {
      try {
        await setDoc(doc(db, "users", u.id), u);
      } catch (err) {
        console.warn("Firestore sync users skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export function getWards(): Ward[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_wards") || "[]");
}

export function saveWards(wards: Ward[]) {
  localStorage.setItem("thulamela_crm_wards", JSON.stringify(wards));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    wards.forEach(async (w) => {
      try {
        await setDoc(doc(db, "wards", `ward-${w.wardNumber}`), w);
      } catch (err) {
        console.warn("Firestore sync wards skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export function getDepartments(): Department[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_departments") || "[]");
}

export function getTechnicians(): Technician[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_technicians") || "[]");
}

export function saveTechnicians(technicians: Technician[]) {
  localStorage.setItem("thulamela_crm_technicians", JSON.stringify(technicians));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    technicians.forEach(async (t) => {
      try {
        await setDoc(doc(db, "technicians", t.id), t);
      } catch (err) {
        console.warn("Firestore sync technicians skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export function getComplaints(): Complaint[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_complaints") || "[]");
}

export function saveComplaints(complaints: Complaint[]) {
  localStorage.setItem("thulamela_crm_complaints", JSON.stringify(complaints));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    complaints.forEach(async (c) => {
      try {
        await setDoc(doc(db, "complaints", c.id), c);
      } catch (err) {
        console.warn("Firestore sync complaints skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export async function deleteComplaint(complaint: Complaint): Promise<void> {
  const complaints = getComplaints();
  const filtered = complaints.filter(c => c.id !== complaint.id);
  saveComplaints(filtered);

  if (complaint.supportingImages && Array.isArray(complaint.supportingImages)) {
    for (const url of complaint.supportingImages) {
      if (typeof url === "string" && url.startsWith("https://firebasestorage")) {
        try {
          if (storage) {
            await deleteObject(ref(storage, url));
          }
        } catch (err) {
          console.warn("Failed to delete storage file for complaint image:", url, err);
        }
      }
    }
  }

  if (isFirebaseEnabled && db) {
    try {
      await deleteDoc(doc(db, "complaints", complaint.id));
    } catch (err: any) {
      console.error("Firestore error deleting complaint:", err);
      handleFirestoreError(err, OperationType.DELETE, `complaints/${complaint.id}`);
    }
  }

  const currentUser = getCurrentUser();
  addAuditLog(
    currentUser?.id || "ADMIN-001",
    currentUser?.name || "Administrator",
    currentUser?.role || "super_admin",
    "Delete Complaint",
    `Deleted complaint #${complaint.id} - ${complaint.title}`
  );
}

export function getNotifications(): Notification[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_notifications") || "[]");
}

export function saveNotifications(notifications: Notification[]) {
  localStorage.setItem("thulamela_crm_notifications", JSON.stringify(notifications));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    notifications.forEach(async (n) => {
      try {
        await setDoc(doc(db, "notifications", n.id), n);
      } catch (err) {
        console.warn("Firestore sync notifications skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export async function saveSingleNotification(n: Notification): Promise<void> {
  const current = getNotifications();
  const updated = [n, ...current.filter(existing => existing.id !== n.id)];
  localStorage.setItem("thulamela_crm_notifications", JSON.stringify(updated));
  triggerDbUpdateEvent();

  if (isFirebaseEnabled && db) {
    try {
      await setDoc(doc(db, "notifications", n.id), n);
    } catch (err: any) {
      console.error("Firestore error saving notification:", err);
      handleFirestoreError(err, OperationType.WRITE, `notifications/${n.id}`);
    }
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  const notifications = getNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  saveNotifications(filtered);

  if (isFirebaseEnabled && db) {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (err: any) {
      console.error("Firestore error deleting notification:", err);
      handleFirestoreError(err, OperationType.DELETE, `notifications/${notificationId}`);
    }
  }
}

export function getAnnouncements(): Announcement[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_announcements") || "[]");
}

export function saveAnnouncements(announcements: Announcement[]) {
  localStorage.setItem("thulamela_crm_announcements", JSON.stringify(announcements));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    announcements.forEach(async (a) => {
      try {
        await setDoc(doc(db, "announcements", a.id), a);
      } catch (err) {
        console.warn("Firestore sync announcements skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

const syncedAuditLogIds = new Set<string>();

export function getAuditLogs(): AuditLog[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_audit_logs") || "[]");
}

export function saveAuditLogs(logs: AuditLog[]) {
  localStorage.setItem("thulamela_crm_audit_logs", JSON.stringify(logs));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    const unsyncedLogs = logs.filter(l => !syncedAuditLogIds.has(l.id));
    unsyncedLogs.forEach(async (l) => {
      syncedAuditLogIds.add(l.id);
      try {
        await setDoc(doc(db, "auditLogs", l.id), l);
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        if (!errMsg.includes("permission") && !errMsg.includes("insufficient") && !errMsg.includes("unauthenticated")) {
          console.warn("Firestore sync audit log skipped/failed:", errMsg);
        }
      }
    });
  }
}

// Active session helpers
export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem("thulamela_crm_current_user");
  return userJson ? JSON.parse(userJson) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem("thulamela_crm_current_user", JSON.stringify(user));
    if (user.role === "super_admin" || user.role === "municipal_admin") {
      triggerAdminSeedingIfAuthorized();
    }
  } else {
    localStorage.removeItem("thulamela_crm_current_user");
    cleanupFirestoreListeners();
  }
}

// Business Logic Helpers
export function addAuditLog(userId: string, userName: string, userRole: UserRole, action: string, details: string) {
  const logs = getAuditLogs();
  const newLog: AuditLog = {
    id: `audit-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    userRole,
    action,
    details
  };
  logs.unshift(newLog); // Put new logs at the beginning
  saveAuditLogs(logs);
}

export function addNotification(userId: string, role: UserRole | "all" | undefined, title: string, message: string, type: "info" | "success" | "warning" | "alert", complaintId?: string) {
  const notifications = getNotifications();
  const newNotif: Notification = {
    id: `notif-${Date.now()}`,
    userId,
    role: role || undefined,
    title,
    message,
    type,
    isRead: false,
    timestamp: new Date().toISOString(),
    complaintId
  };
  notifications.unshift(newNotif);
  saveNotifications(notifications);
}

// Calculate ward stats based on complaints
export function getWardStatsMap() {
  const complaints = getComplaints();
  const map: Record<number, { count: number; resolved: number; pending: number }> = {};
  
  // Init map with 0s
  for (let i = 1; i <= 41; i++) {
    map[i] = { count: 0, resolved: 0, pending: 0 };
  }
  
  complaints.forEach(c => {
    const wardNum = c.wardNumber;
    if (wardNum >= 1 && wardNum <= 41) {
      map[wardNum].count++;
      if (c.status === "Resolved" || c.status === "Closed") {
        map[wardNum].resolved++;
      } else {
        map[wardNum].pending++;
      }
    }
  });
  
  return map;
}

// Get and save Chat Rooms
export function getChatRooms(): ChatRoom[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_chat_rooms") || "[]");
}

export function saveChatRooms(rooms: ChatRoom[]) {
  localStorage.setItem("thulamela_crm_chat_rooms", JSON.stringify(rooms));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    rooms.forEach(async (r) => {
      try {
        await setDoc(doc(db, "chatRooms", r.id), r);
      } catch (err) {
        console.warn("Firestore sync chatRooms skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

// Get and save Chat Messages
export function getChatMessages(): ChatMessage[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_chat_messages") || "[]");
}

export function saveChatMessages(messages: ChatMessage[]) {
  localStorage.setItem("thulamela_crm_chat_messages", JSON.stringify(messages));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    messages.forEach(async (m) => {
      try {
        await setDoc(doc(db, "chatMessages", m.id), m);
      } catch (err) {
        console.warn("Firestore sync chatMessages skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

// Calculate total unread messages for a specific user
export function getUnreadChatCount(userId: string): number {
  if (!userId) return 0;
  const rooms = getChatRooms();
  const messages = getChatMessages();
  
  const myRoomIds = new Set(
    rooms
      .filter(r => r.participants && r.participants.includes(userId))
      .map(r => r.id)
  );
  
  return messages.filter(m => 
    myRoomIds.has(m.roomId) && 
    m.senderId !== userId && 
    (!m.readBy || !m.readBy.includes(userId))
  ).length;
}

// Mark messages in a specific room as read for a specific user
export function markRoomMessagesAsRead(roomId: string, userId: string): boolean {
  if (!roomId || !userId) return false;
  const allMsgs = getChatMessages();
  let updated = false;
  const updatedMsgs = allMsgs.map(m => {
    if (m.roomId === roomId && m.senderId !== userId) {
      const reads = m.readBy || [];
      if (!reads.includes(userId)) {
        updated = true;
        return { ...m, readBy: [...reads, userId] };
      }
    }
    return m;
  });
  if (updated) {
    saveChatMessages(updatedMsgs);
  }
  return updated;
}

// Get and save Calendar Events
export function getCalendarEvents(): CalendarEvent[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_calendar_events") || "[]");
}

export function saveCalendarEvents(events: CalendarEvent[]) {
  localStorage.setItem("thulamela_crm_calendar_events", JSON.stringify(events));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    events.forEach(async (e) => {
      try {
        await setDoc(doc(db, "calendarEvents", e.id), e);
      } catch (err) {
        console.warn("Firestore sync calendarEvents skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export async function saveSingleCalendarEvent(event: CalendarEvent): Promise<void> {
  const current = getCalendarEvents();
  const idx = current.findIndex(e => e.id === event.id);
  let updated: CalendarEvent[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = event;
  } else {
    updated = [event, ...current];
  }
  localStorage.setItem("thulamela_crm_calendar_events", JSON.stringify(updated));
  triggerDbUpdateEvent();

  if (isFirebaseEnabled && db) {
    try {
      await setDoc(doc(db, "calendarEvents", event.id), event);
    } catch (err: any) {
      console.error("Firestore error saving calendar event:", err);
      handleFirestoreError(err, OperationType.WRITE, `calendarEvents/${event.id}`);
    }
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const current = getCalendarEvents();
  const filtered = current.filter(e => e.id !== id);
  localStorage.setItem("thulamela_crm_calendar_events", JSON.stringify(filtered));
  triggerDbUpdateEvent();

  if (isFirebaseEnabled && db) {
    try {
      await deleteDoc(doc(db, "calendarEvents", id));
    } catch (err: any) {
      console.error("Firestore error deleting calendar event:", err);
      handleFirestoreError(err, OperationType.DELETE, `calendarEvents/${id}`);
    }
  }
}

// Get and save Tasks
export function getTasks(): Task[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_tasks") || "[]");
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem("thulamela_crm_tasks", JSON.stringify(tasks));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    tasks.forEach(async (t) => {
      try {
        await setDoc(doc(db, "tasks", t.id), t);
      } catch (err) {
        console.warn("Firestore sync tasks skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

// Get and save Documents
export function getDocuments(): MunicipalDocument[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_documents") || "[]");
}

export function saveDocuments(documents: MunicipalDocument[]) {
  localStorage.setItem("thulamela_crm_documents", JSON.stringify(documents));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    documents.forEach(async (d) => {
      try {
        await setDoc(doc(db, "documents", d.id), d);
      } catch (err) {
        console.warn("Firestore sync documents skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

// Get and save Digital Forms
export function getDigitalForms(): DigitalForm[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_digital_forms") || "[]");
}

export function saveDigitalForms(forms: DigitalForm[]) {
  localStorage.setItem("thulamela_crm_digital_forms", JSON.stringify(forms));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    forms.forEach(async (f) => {
      try {
        await setDoc(doc(db, "digitalForms", f.id), f);
      } catch (err) {
        console.warn("Firestore sync digitalForms skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}

export function getServiceNotices(): ServiceNotice[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_service_notices") || "[]");
}

export function normalizeServiceNotice(notice: ServiceNotice): ServiceNotice {
  const validCategories = ['Water', 'Electricity', 'Roads', 'Sewer', 'Waste', 'StreetLights', 'StormWater', 'Parks', 'Housing', 'General'];
  const validStatuses = ['Operational', 'Maintenance', 'Emergency', 'Scheduled', 'In Progress', 'Delayed', 'Completed'];
  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

  const category = validCategories.includes(notice.category) ? notice.category : 'General';
  const status = validStatuses.includes(notice.status) ? notice.status : 'In Progress';
  const priority = validPriorities.includes(notice.priority) ? notice.priority : 'Medium';

  return {
    id: notice.id,
    title: notice.title || "Municipal Service Notice",
    category,
    status,
    cause: notice.cause || "Routine Maintenance",
    description: notice.description || "Routine maintenance or service update.",
    dateReported: notice.dateReported || new Date().toISOString(),
    priority,
    department: notice.department || "Technical Services",
    departmentManager: notice.departmentManager || "Municipal Response Desk",
    emergencyNumber: notice.emergencyNumber || "015 962 7500",
    email: notice.email || "customercare@thulamela.gov.za",
    officeHours: notice.officeHours || "07:30 - 16:30 (Mon-Fri)",
    referenceNumber: notice.referenceNumber || `NOT-${Date.now().toString().slice(-6)}`,
    progress: typeof notice.progress === "number" ? notice.progress : 25,
    timeline: Array.isArray(notice.timeline) ? notice.timeline : [
      { time: new Date().toISOString().replace("T", " ").slice(0, 16), description: "Service notice published." }
    ],
    affectedWards: Array.isArray(notice.affectedWards) ? notice.affectedWards : [1],
    affectedArea: notice.affectedArea || "Thulamela Local Municipality",
    streetLocation: notice.streetLocation || "",
    estimatedCompletion: notice.estimatedCompletion || "",
    assignedTechnician: notice.assignedTechnician || "",
    householdsAffected: typeof notice.householdsAffected === "number" ? notice.householdsAffected : 0,
    photos: Array.isArray(notice.photos) ? notice.photos : [],
    videos: Array.isArray(notice.videos) ? notice.videos : [],
    gpsCoordinates: notice.gpsCoordinates || "",
  };
}

export async function saveSingleServiceNotice(notice: ServiceNotice): Promise<void> {
  const normalized = normalizeServiceNotice(notice);
  const current = getServiceNotices();
  const idx = current.findIndex(n => n.id === normalized.id);
  let updated: ServiceNotice[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = normalized;
  } else {
    updated = [normalized, ...current];
  }
  localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(updated));
  triggerDbUpdateEvent();

  if (isFirebaseEnabled && db) {
    try {
      await setDoc(doc(db, "serviceNotices", normalized.id), normalized);
    } catch (err: any) {
      console.error("Firestore error saving serviceNotice:", err);
      handleFirestoreError(err, OperationType.WRITE, `serviceNotices/${normalized.id}`);
    }
  }
}

export async function deleteServiceNotice(id: string): Promise<void> {
  const current = getServiceNotices();
  const filtered = current.filter(n => n.id !== id);
  localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(filtered));
  triggerDbUpdateEvent();

  if (isFirebaseEnabled && db) {
    try {
      await deleteDoc(doc(db, "serviceNotices", id));
    } catch (err: any) {
      console.error("Firestore error deleting serviceNotice:", err);
      handleFirestoreError(err, OperationType.DELETE, `serviceNotices/${id}`);
    }
  }
}

export function saveServiceNotices(notices: ServiceNotice[]) {
  const normalizedNotices = notices.map(n => normalizeServiceNotice(n));
  localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(normalizedNotices));
  triggerDbUpdateEvent();
  if (isFirebaseEnabled && db) {
    normalizedNotices.forEach(async (n) => {
      try {
        await setDoc(doc(db, "serviceNotices", n.id), n);
      } catch (err) {
        console.warn("Firestore sync serviceNotices skipped/failed:", err);
      }
    });
  }
}

export function migrateUserId(oldId: string, newId: string) {
  console.log(`Migrating user data from old ID ${oldId} to new Firebase Auth UID ${newId}`);
  
  // 1. Users
  const users = getUsers();
  let userUpdated = false;
  const updatedUsers = users.map(u => {
    if (u.id === oldId) {
      userUpdated = true;
      return { ...u, id: newId };
    }
    return u;
  });
  if (userUpdated) {
    localStorage.setItem("thulamela_crm_users", JSON.stringify(updatedUsers));
    // Sync to Firestore under new ID
    const targetUser = updatedUsers.find(u => u.id === newId);
    if (targetUser && isFirebaseEnabled && db) {
      setDoc(doc(db, "users", newId), targetUser).catch(err => console.warn(err));
    }
  }

  // 2. Complaints
  const complaints = getComplaints();
  let complaintsUpdated = false;
  const updatedComplaints = complaints.map(c => {
    let changed = false;
    let repId = c.reporterId;
    let techId = c.assignedTechnicianId;
    if (c.reporterId === oldId) {
      repId = newId;
      changed = true;
    }
    if (c.assignedTechnicianId === oldId) {
      techId = newId;
      changed = true;
    }
    if (changed) {
      complaintsUpdated = true;
      return { ...c, reporterId: repId, assignedTechnicianId: techId };
    }
    return c;
  });
  if (complaintsUpdated) {
    saveComplaints(updatedComplaints);
  }

  // 3. Notifications
  const notifications = getNotifications();
  let notificationsUpdated = false;
  const updatedNotifications = notifications.map(n => {
    if (n.userId === oldId) {
      notificationsUpdated = true;
      return { ...n, userId: newId };
    }
    return n;
  });
  if (notificationsUpdated) {
    saveNotifications(updatedNotifications);
  }

  // 4. Tasks
  const tasks = getTasks();
  let tasksUpdated = false;
  const updatedTasks = tasks.map(t => {
    if (t.assignedUserId === oldId) {
      tasksUpdated = true;
      return { ...t, assignedUserId: newId };
    }
    return t;
  });
  if (tasksUpdated) {
    saveTasks(updatedTasks);
  }

  // 5. Wards
  const wards = getWards();
  let wardsUpdated = false;
  const updatedWards = wards.map(w => {
    if (w.assignedCouncillorId === oldId) {
      wardsUpdated = true;
      return { ...w, assignedCouncillorId: newId };
    }
    return w;
  });
  if (wardsUpdated) {
    saveWards(updatedWards);
  }

  // 6. Chat Rooms
  const chatRooms = getChatRooms();
  let roomsUpdated = false;
  const updatedChatRooms = chatRooms.map(r => {
    if (r.participants.includes(oldId)) {
      roomsUpdated = true;
      return {
        ...r,
        participants: r.participants.map(p => p === oldId ? newId : p)
      };
    }
    return r;
  });
  if (roomsUpdated) {
    saveChatRooms(updatedChatRooms);
  }

  // 7. Chat Messages
  const chatMessages = getChatMessages();
  let messagesUpdated = false;
  const updatedChatMessages = chatMessages.map(m => {
    if (m.senderId === oldId) {
      messagesUpdated = true;
      return { ...m, senderId: newId };
    }
    return m;
  });
  if (messagesUpdated) {
    saveChatMessages(updatedChatMessages);
  }

  // 8. Calendar Events
  const events = getCalendarEvents();
  let eventsUpdated = false;
  const updatedEvents = events.map(e => {
    if (e.assignedUserId === oldId) {
      eventsUpdated = true;
      return { ...e, assignedUserId: newId };
    }
    return e;
  });
  if (eventsUpdated) {
    saveCalendarEvents(updatedEvents);
  }

  // 9. Digital Forms
  const forms = getDigitalForms();
  let formsUpdated = false;
  const updatedForms = forms.map(f => {
    if (f.submittedBy === oldId) {
      formsUpdated = true;
      return { ...f, submittedBy: newId };
    }
    return f;
  });
  if (formsUpdated) {
    saveDigitalForms(updatedForms);
  }
}

export async function cleanCorruptedFirestoreUsers() {
  if (!isFirebaseEnabled || !db) return;
  try {
    const currentUser = getCurrentUser();
    if (currentUser && (currentUser.role === "super_admin" || currentUser.role === "municipal_admin")) {
      console.log("[CLEANUP]: Admin session active. Scanning Firestore users collection for corrupted documents...");
      const snap = await getDocs(collection(db, "users"));
      snap.forEach(async (docSnap) => {
        const data = docSnap.data();
        if (!data || !docSnap.id || !data.id || !data.username || !data.email) {
          console.warn(`[CLEANUP]: Deleting corrupted user document ${docSnap.id} from Firestore...`);
          try {
            await deleteDoc(doc(db, "users", docSnap.id));
            console.log(`[CLEANUP]: Successfully deleted corrupted user document ${docSnap.id}`);
          } catch (deleteErr) {
            console.warn(`[CLEANUP]: Failed to delete corrupted document ${docSnap.id}:`, deleteErr);
          }
        }
      });
    }
  } catch (err) {
    console.warn("[CLEANUP]: Failed to clean corrupted Firestore users (this is expected if unauthorized or offline):", err);
  }
}
