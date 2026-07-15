import { User, Ward, Department, Technician, Complaint, Notification, Announcement, AuditLog, UserRole, ChatMessage, ChatRoom, CalendarEvent, Task, MunicipalDocument, DigitalForm, AccountRequest, ServiceNotice } from "./types";
import { SEED_WARDS, DEPARTMENTS, SEED_TECHNICIANS, SEED_USERS, SEED_COMPLAINTS, ANNOUNCEMENTS, SEED_SERVICE_NOTICES } from "./data";
import { isFirebaseEnabled, db, auth } from "./firebase";
import { signInAnonymously } from "firebase/auth";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  query, 
  writeBatch,
  where,
  limit
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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
    errInfo.error.includes("permission") || 
    errInfo.error.includes("Permission") || 
    errInfo.error.includes("insufficient") ||
    errInfo.error.includes("unauthenticated") ||
    errInfo.error.includes("auth/");

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

export function initializeDb() {
  // 1. Setup local storage seeding first so app works instantly
  if (!localStorage.getItem("thulamela_crm_users")) {
    localStorage.setItem("thulamela_crm_users", JSON.stringify(SEED_USERS));
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

// Background FireStore Real-Time Listener and Seeding Sync Manager
async function setupFirestoreListenersAndSync() {
  if (!isFirebaseEnabled || !db) return;

  // Helper to check if a collection is empty
  const isCollectionEmpty = async (collectionName: string) => {
    try {
      const q = query(collection(db, collectionName), limit(1));
      const snap = await getDocs(q);
      return snap.empty;
    } catch (error) {
      console.warn(`Could not check if collection ${collectionName} is empty (expected if restricted):`, error);
      return false;
    }
  };

  // Seeding Firestore from Local Storage if empty (ensures Firebase backend is instant-loaded)
  const seedIfEmpty = async (collectionName: string, getLocalData: () => any[]) => {
    const empty = await isCollectionEmpty(collectionName);
    if (empty) {
      console.log(`Seeding Firestore collection: ${collectionName} with initial data...`);
      const data = getLocalData();
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = doc(collection(db, collectionName), item.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`);
        batch.set(docRef, item);
      });
      try {
        await batch.commit();
      } catch (error) {
        console.warn(`Seeding Firestore collection ${collectionName} skipped (expected if not Admin):`, error);
      }
    }
  };

  // Run seed check for core collections
  await seedIfEmpty("users", getUsers);
  await seedIfEmpty("wards", getWards);
  await seedIfEmpty("departments", getDepartments);
  await seedIfEmpty("technicians", getTechnicians);
  await seedIfEmpty("complaints", getComplaints);
  await seedIfEmpty("announcements", getAnnouncements);
  await seedIfEmpty("notifications", getNotifications);
  await seedIfEmpty("auditLogs", getAuditLogs);
  await seedIfEmpty("serviceNotices", getServiceNotices);

  // Setup Real-Time Listeners to update localstorage dynamically when data changes on cloud
  onSnapshot(collection(db, "users"), (snapshot) => {
    const list: User[] = [];
    snapshot.forEach(doc => list.push(doc.data() as User));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_users", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "users");
  });

  onSnapshot(collection(db, "complaints"), (snapshot) => {
    const list: Complaint[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Complaint));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_complaints", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "complaints");
  });

  onSnapshot(collection(db, "notifications"), (snapshot) => {
    const list: Notification[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Notification));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_notifications", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "notifications");
  });

  onSnapshot(collection(db, "announcements"), (snapshot) => {
    const list: Announcement[] = [];
    snapshot.forEach(doc => list.push(doc.data() as Announcement));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_announcements", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "announcements");
  });

  onSnapshot(collection(db, "auditLogs"), (snapshot) => {
    const list: AuditLog[] = [];
    snapshot.forEach(doc => list.push(doc.data() as AuditLog));
    if (list.length > 0) {
      localStorage.setItem("thulamela_crm_audit_logs", JSON.stringify(list));
      triggerDbUpdateEvent();
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "auditLogs");
  });

  onSnapshot(collection(db, "serviceNotices"), (snapshot) => {
    const list: ServiceNotice[] = [];
    snapshot.forEach(doc => list.push(doc.data() as ServiceNotice));
    localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(list));
    triggerDbUpdateEvent();
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, "serviceNotices");
  });
}

// Low-level Getters & Setters
export function getUsers(): User[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_users") || "[]");
}

export function saveUsers(users: User[]) {
  localStorage.setItem("thulamela_crm_users", JSON.stringify(users));
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

export function getNotifications(): Notification[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_notifications") || "[]");
}

export function saveNotifications(notifications: Notification[]) {
  localStorage.setItem("thulamela_crm_notifications", JSON.stringify(notifications));
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

export function getAnnouncements(): Announcement[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_announcements") || "[]");
}

export function saveAnnouncements(announcements: Announcement[]) {
  localStorage.setItem("thulamela_crm_announcements", JSON.stringify(announcements));
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

export function getAuditLogs(): AuditLog[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_audit_logs") || "[]");
}

export function saveAuditLogs(logs: AuditLog[]) {
  localStorage.setItem("thulamela_crm_audit_logs", JSON.stringify(logs));
  if (isFirebaseEnabled && db) {
    logs.forEach(async (l) => {
      try {
        await setDoc(doc(db, "auditLogs", l.id), l);
      } catch (err) {
        console.warn("Firestore sync audit logs skipped/failed (expected if unauthorized or offline):", err);
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
  } else {
    localStorage.removeItem("thulamela_crm_current_user");
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

// Get and save Calendar Events
export function getCalendarEvents(): CalendarEvent[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_calendar_events") || "[]");
}

export function saveCalendarEvents(events: CalendarEvent[]) {
  localStorage.setItem("thulamela_crm_calendar_events", JSON.stringify(events));
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

// Get and save Tasks
export function getTasks(): Task[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_tasks") || "[]");
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem("thulamela_crm_tasks", JSON.stringify(tasks));
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
// Get and save Digital Forms
export function getDigitalForms(): DigitalForm[] {
  return JSON.parse(localStorage.getItem("thulamela_crm_digital_forms") || "[]");
}

export function saveDigitalForms(forms: DigitalForm[]) {
  localStorage.setItem("thulamela_crm_digital_forms", JSON.stringify(forms));
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

export function saveServiceNotices(notices: ServiceNotice[]) {
  localStorage.setItem("thulamela_crm_service_notices", JSON.stringify(notices));
  if (isFirebaseEnabled && db) {
    notices.forEach(async (n) => {
      try {
        await setDoc(doc(db, "serviceNotices", n.id), n);
      } catch (err) {
        console.warn("Firestore sync serviceNotices skipped/failed (expected if unauthorized or offline):", err);
      }
    });
  }
}
