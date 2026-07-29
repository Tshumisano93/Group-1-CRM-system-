import React, { useState, useEffect } from "react";
import { 
  getComplaints, 
  saveComplaints, 
  getTechnicians, 
  saveTechnicians, 
  addAuditLog, 
  addNotification,
  getNotifications,
  saveNotifications,
  deleteNotification,
  getSyncStatus,
  getChatRooms,
  saveChatRooms
} from "../db";
import { User, Complaint, Technician, ComplaintLog, ComplaintComment, ComplaintStatus, ComplaintPriority, UserRole, ChatRoom, Notification } from "../types";
import { Skeleton, SkeletonCard, DashboardSkeleton } from "./Skeleton";
import { 
  LayoutDashboard,
  Wrench, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  AlertTriangle, 
  X, 
  Send, 
  TrendingUp, 
  MapPin, 
  Phone, 
  Mail, 
  Sparkles, 
  Check, 
  Upload, 
  Play, 
  Volume2, 
  FolderPlus,
  Compass,
  CheckCircle,
  HelpCircle,
  FileSpreadsheet,
  MessageSquare,
  Map,
  Folder,
  Clipboard,
  Bell
} from "lucide-react";

import InternalChat from "./InternalChat";
import MunicipalCalendar from "./MunicipalCalendar";
import InteractiveGIS from "./InteractiveGIS";
import DocumentManager from "./DocumentManager";
import DigitalForms from "./DigitalForms";
import FileUploader from "./FileUploader";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseEnabled } from "../firebase";

interface TechnicianDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type TechTab = "dashboard" | "assigned" | "schedule" | "completed" | "reports" | "profile" | "settings" | "chat" | "calendar" | "gis" | "documents" | "digital_forms" | "notifications";

export default function TechnicianDashboard({
  currentUser,
  onLogout,
  onNavigate,
  onAddToast
}: TechnicianDashboardProps) {
  const [activeTab, setActiveTab] = useState<TechTab>("dashboard");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string>("");
  const [techProfile, setTechProfile] = useState<Technician | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Actions States
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [additionalInfoText, setAdditionalInfoText] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Progress Reporting States
  const [progressPercent, setProgressPercent] = useState<number>(50);
  const [progressNotes, setProgressNotes] = useState("");
  const [progressMediaUrl, setProgressMediaUrl] = useState("");
  const [progressMediaType, setProgressMediaType] = useState<"photo" | "video" | "voicenote">("photo");
  const [progressFiles, setProgressFiles] = useState<File[]>([]);
  const [estCompletionDate, setEstCompletionDate] = useState("");
  const [showProgressModal, setShowProgressModal] = useState(false);

  const getProgressAllowedTypes = () => {
    if (progressMediaType === "photo") {
      return ["image/jpeg", "image/png"];
    }
    if (progressMediaType === "video") {
      return ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    }
    return ["audio/mpeg", "audio/wav", "audio/mp3", "audio/ogg"];
  };

  const handleProgressFilesChange = async (newFiles: File[]) => {
    setProgressFiles(newFiles);
    if (newFiles.length > 0) {
      const file = newFiles[newFiles.length - 1];
      const complaintId = selectedComplaint?.id || "general";
      onAddToast("Uploading Media", `Uploading ${file.name}...`, "info");
      try {
        if (isFirebaseEnabled && storage) {
          const storagePath = `progress-media/${complaintId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(snapshot.ref);
          setProgressMediaUrl(downloadUrl);
          onAddToast("Upload Complete", "Media uploaded to Firebase Storage successfully.", "success");
        } else {
          const localUrl = URL.createObjectURL(file);
          setProgressMediaUrl(localUrl);
          onAddToast("Media Attached", "Local media file attached successfully.", "info");
        }
      } catch (err) {
        console.error("Firebase Storage upload error, falling back to local object URL:", err);
        const localUrl = URL.createObjectURL(file);
        setProgressMediaUrl(localUrl);
        onAddToast("Media Attached", "Attached local media file.", "warning");
      }
    } else {
      setProgressMediaUrl("");
    }
  };

  // Material Request States
  const [materialType, setMaterialType] = useState("Pipes & Couplings");
  const [materialQty, setMaterialQty] = useState("1");
  const [materialSupplier, setMaterialSupplier] = useState("Vhembe Hardware Wholesale");
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  // Completion Report States
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionHours, setCompletionHours] = useState("3");
  const [completionMaterialsUsed, setCompletionMaterialsUsed] = useState("");
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Gemini AI Tech States
  const [isGeneratingResolution, setIsGeneratingResolution] = useState(false);
  const [syncState, setSyncState] = useState<string>("offline");

  // Chat message
  const [newComment, setNewComment] = useState("");

  // Load and refresh
  const loadTechData = () => {
    const allComps = getComplaints();
    const allTechs = getTechnicians();
    
    // Filter complaints assigned to this technician
    const myComps = allComps.filter(c => c.assignedTechnicianId === currentUser.id);
    setComplaints(myComps);
    setTechnicians(allTechs);

    const allNotifs = getNotifications();
    const myNotifs = allNotifs.filter(n => {
      if (n.userId === currentUser.id || n.userId === "all") return true;
      if (n.role === currentUser.role) return true;
      return false;
    });
    setNotifications(myNotifs);

    const currentTech = allTechs.find(t => t.id === currentUser.id);
    if (currentTech) {
      setTechProfile(currentTech);
    } else {
      // Create profile fallback
      const fallbackTech: Technician = {
        id: currentUser.id,
        name: currentUser.name,
        departmentId: "DEP-01",
        departmentName: "Water and Sanitation",
        phone: currentUser.phone || "072 111 2222",
        email: currentUser.email || "tech@thulamela.gov.za",
        status: "available",
        activeTasks: myComps.filter(c => c.status !== "Resolved" && c.status !== "Closed").length,
        completedTasks: myComps.filter(c => c.status === "Resolved" || c.status === "Closed").length
      };
      setTechProfile(fallbackTech);
    }
  };

  const handleClearAllNotifications = async () => {
    const toDelete = [...notifications];
    for (const n of toDelete) {
      await deleteNotification(n.id);
    }
    setNotifications([]);
    onAddToast("Notifications Cleared", "All visible notifications have been removed.", "info");
  };

  const handleDismissNotification = async (id: string) => {
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    setIsLoading(true);
    loadTechData();
    setSyncState(getSyncStatus());
    setIsLoading(false);

    const handleDbUpdate = () => {
      loadTechData();
      setSyncState(getSyncStatus());
    };
    window.addEventListener("thulamela_db_update", handleDbUpdate);

    return () => {
      window.removeEventListener("thulamela_db_update", handleDbUpdate);
    };
  }, [currentUser]);

  const handleAutoDraftResolution = async () => {
    if (!selectedComplaint) return;
    setIsGeneratingResolution(true);
    onAddToast("Gemini Thinking", "Formulating official technician completion summary using engineering criteria...", "info");

    try {
      const response = await fetch("/api/gemini/resolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedComplaint.id,
          title: selectedComplaint.title,
          description: selectedComplaint.description,
          category: selectedComplaint.category,
          hoursSpent: completionHours,
          materialsUsed: completionMaterialsUsed || "Various plumbing/electrical hand fittings"
        })
      });

      if (!response.ok) {
        throw new Error("Resolution endpoint returned error");
      }

      const data = await response.json();
      setCompletionNotes(data.technicalSummary);
      setCompletionMaterialsUsed(data.materialsUsed || completionMaterialsUsed);
      onAddToast("Auto-Draft Loaded", "Technical summary draft filled successfully!", "success");
    } catch (err) {
      console.error(err);
      onAddToast("AI Draft Error", "Could not reach Gemini AI. Please fill in resolution details manually.", "error");
    } finally {
      setIsGeneratingResolution(false);
    }
  };

  // Status handlers
  const handleAcceptAssignment = (complaintId: string) => {
    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const logs: ComplaintLog[] = [...c.logs, {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Technician Accepted",
          userName: currentUser.name,
          userRole: "technician",
          note: "Technician has reviewed the municipal docket and accepted the assignment field duties."
        }];
        return {
          ...c,
          status: "In Progress" as ComplaintStatus,
          logs,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);
    
    // Notify councillor
    const comp = allComps.find(c => c.id === complaintId);
    if (comp) {
      addNotification(
        comp.reporterId,
        "councillor",
        `Technician Accepted COMP-${complaintId.split('-')[1] || complaintId}`,
        `Technician ${currentUser.name} has accepted your docket '${comp.title}' and is in transit to the site.`,
        "info",
        complaintId
      );
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Accept Assignment",
      `Technician accepted docket: ${complaintId}`
    );

    // Update technician status to busy
    const updatedTechs = technicians.map(t => {
      if (t.id === currentUser.id) {
        return { ...t, status: "busy" as const };
      }
      return t;
    });
    saveTechnicians(updatedTechs);

    onAddToast("Docket Accepted", "You have accepted this task. Drive safe to location.", "success");
    loadTechData();
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      const updatedComp = updated.find(c => c.id === complaintId);
      if (updatedComp) setSelectedComplaint(updatedComp);
    }
  };

  const handleRejectAssignment = (complaintId: string) => {
    if (!rejectionReason.trim()) {
      onAddToast("Rejection Failed", "Please state a logical reason for rejecting this assignment.", "warning");
      return;
    }

    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const logs: ComplaintLog[] = [...c.logs, {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Assignment Rejected",
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          note: `Technician rejected allocation. Reason: ${rejectionReason}`
        }];
        return {
          ...c,
          status: "Submitted" as ComplaintStatus, // return to queue
          assignedTechnicianId: null,
          assignedTechnicianName: null,
          logs,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);

    // Notify administration
    addNotification(
      "ADMIN-001",
      "super_admin",
      `Technician Rejected COMP-${complaintId.split('-')[1] || complaintId}`,
      `Technician ${currentUser.name} rejected assigned docket ${complaintId}. Reason: ${rejectionReason}`,
      "warning",
      complaintId
    );

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Reject Assignment",
      `Technician rejected docket: ${complaintId}. Reason: ${rejectionReason}`
    );

    onAddToast("Docket Returned", "Docket returned to municipal dispatch queue.", "info");
    setShowRejectModal(false);
    setSelectedComplaint(null);
    setRejectionReason("");
    loadTechData();
  };

  const handleRequestInfo = (complaintId: string) => {
    if (!additionalInfoText.trim()) {
      onAddToast("Request Failed", "Please specify what details you require from the ward councillor.", "warning");
      return;
    }

    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const logs: ComplaintLog[] = [...c.logs, {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Information Requested",
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          note: `Technician requested details: "${additionalInfoText}"`
        }];
        const comments: ComplaintComment[] = [...c.comments, {
          id: `com-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          message: `🚨 IMPORTANT REQUEST FOR DETAILS: ${additionalInfoText}`
        }];
        return {
          ...c,
          status: "Under Review" as ComplaintStatus,
          logs,
          comments,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);

    // Notify councillor
    const comp = allComps.find(c => c.id === complaintId);
    if (comp) {
      addNotification(
        comp.reporterId,
        "councillor",
        `Details Requested: COMP-${complaintId.split('-')[1] || complaintId}`,
        `Technician ${currentUser.name} requires supplementary details to solve '${comp.title}'.`,
        "warning",
        complaintId
      );
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Request Information",
      `Requested supplementary information for docket ${complaintId}`
    );

    onAddToast("Request Transmitted", "Message dispatched to the Ward Councillor's notifications.", "success");
    setShowInfoModal(false);
    setAdditionalInfoText("");
    loadTechData();
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      const updatedComp = updated.find(c => c.id === complaintId);
      if (updatedComp) setSelectedComplaint(updatedComp);
    }
  };

  const handleUpdateProgress = (complaintId: string) => {
    if (!progressNotes.trim()) {
      onAddToast("Validation Error", "Please provide progressive details about the current status.", "warning");
      return;
    }

    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const logs: ComplaintLog[] = [...c.logs, {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Progress Update",
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          note: `Progress: ${progressPercent}%. Notes: ${progressNotes}${estCompletionDate ? ` (Est completion: ${estCompletionDate})` : ""}`
        }];
        return {
          ...c,
          status: "In Progress" as ComplaintStatus,
          logs,
          resolutionNotes: `Current progress: ${progressPercent}%. Last notes: ${progressNotes}`,
          referencePhoto: progressMediaUrl || c.referencePhoto,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Progress Update",
      `Updated progress on docket ${complaintId} to ${progressPercent}%`
    );

    onAddToast("Progress Logged", "Progress report saved into system registry.", "success");
    setShowProgressModal(false);
    setProgressNotes("");
    setProgressMediaUrl("");
    setProgressFiles([]);
    loadTechData();
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      const updatedComp = updated.find(c => c.id === complaintId);
      if (updatedComp) setSelectedComplaint(updatedComp);
    }
  };

  const handleRequestMaterials = (complaintId: string) => {
    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const logs: ComplaintLog[] = [...c.logs, {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Materials Requested",
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          note: `Requisition: ${materialQty}x ${materialType} from ${materialSupplier}. Status: Pending Depot Approval.`
        }];
        return {
          ...c,
          status: "Waiting for Parts" as ComplaintStatus,
          logs,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);

    // Notify logistics / admins
    addNotification(
      "ADMIN-001",
      "super_admin",
      `Material Requisition COMP-${complaintId.split('-')[1] || complaintId}`,
      `Technician ${currentUser.name} requested: ${materialQty}x ${materialType} for ${complaintId}.`,
      "info",
      complaintId
    );

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Material Request",
      `Requested ${materialQty}x ${materialType} for ${complaintId}`
    );

    onAddToast("Requisition Submitted", "Material request transmitted to civic depot manager.", "success");
    setShowMaterialModal(false);
    loadTechData();
    if (selectedComplaint && selectedComplaint.id === complaintId) {
      const updatedComp = updated.find(c => c.id === complaintId);
      if (updatedComp) setSelectedComplaint(updatedComp);
    }
  };

  const handleSubmitCompletionReport = (complaintId: string) => {
    if (!completionNotes.trim()) {
      onAddToast("Validation Error", "Please summarize technical resolution particulars.", "warning");
      return;
    }

    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const logs: ComplaintLog[] = [...c.logs, {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Work Completed",
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          note: `Completed in ${completionHours} hours. Materials Used: ${completionMaterialsUsed || "Standard tools"}. Notes: ${completionNotes}`
        }];
        return {
          ...c,
          status: "Resolved" as ComplaintStatus,
          logs,
          resolutionNotes: completionNotes,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);

    // Notify Councillor for Verification
    const comp = allComps.find(c => c.id === complaintId);
    if (comp) {
      addNotification(
        comp.reporterId,
        "councillor",
        `Docket COMP-${complaintId.split('-')[1] || complaintId} Resolved`,
        `Technician ${currentUser.name} has marked '${comp.title}' as Resolved. Please inspect on site and verify.`,
        "success",
        complaintId
      );
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Submit Completion Report",
      `Marked docket ${complaintId} as Resolved.`
    );

    // Update technician status back to available
    const updatedTechs = technicians.map(t => {
      if (t.id === currentUser.id) {
        return { ...t, status: "available" as const };
      }
      return t;
    });
    saveTechnicians(updatedTechs);

    onAddToast("Work Completed Successfully", "Docket is now in 'Resolved' state. Ward Councillor has been notified for inspection verification.", "success");
    setShowCompletionModal(false);
    setSelectedComplaint(null);
    setCompletionNotes("");
    setCompletionMaterialsUsed("");
    loadTechData();
  };

  const handleAddComment = (complaintId: string) => {
    if (!newComment.trim()) return;

    const allComps = getComplaints();
    const updated = allComps.map(c => {
      if (c.id === complaintId) {
        const comments: ComplaintComment[] = [...c.comments, {
          id: `com-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: "technician" as UserRole,
          message: newComment
        }];
        return {
          ...c,
          comments,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);
    addAuditLog(
      currentUser.id,
      currentUser.name,
      "technician",
      "Add Comment",
      `Appended comment on ticket: ${complaintId}`
    );

    setNewComment("");
    onAddToast("Comment Posted", "Your message is appended to the ticket file.", "success");
    
    // Refresh local details view
    const match = updated.find(c => c.id === complaintId);
    if (match) setSelectedComplaint(match);
    loadTechData();
  };

  const handleStartCouncillorChat = (complaint: Complaint) => {
    if (!complaint.reporterId) return;
    const allRooms = getChatRooms();
    const roomId = `room-complaint-${complaint.id}`;
    const roomName = `Feedback: ${complaint.id} (Councillor ${complaint.reporterName || "Reporter"})`;
    
    const existing = allRooms.find(r => r.id === roomId);
    if (!existing) {
      const newRoom: ChatRoom = {
        id: roomId,
        name: roomName,
        type: "direct",
        participants: [currentUser.id, complaint.reporterId],
        complaintId: complaint.id,
        lastMessage: "Complaint feedback channel initiated.",
        lastMessageTime: new Date().toISOString()
      };
      saveChatRooms([newRoom, ...allRooms]);
    }
    setActiveChatRoomId(roomId);
    setActiveTab("chat");
    setSelectedComplaint(null);
  };

  const activeJobsCount = complaints.filter(c => c.status !== "Resolved" && c.status !== "Closed" && c.status !== "Rejected" && c.status !== "Cancelled").length;
  const resolvedJobsCount = complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length;

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div id="tech-dashboard-container" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-5 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-full border border-gov-yellow bg-slate-800 flex items-center justify-center overflow-hidden font-mono font-black text-gov-yellow">
              TECH
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-100 uppercase tracking-wider block">{currentUser.name.split(" ").slice(-1)[0]}</h4>
              <span className="text-[10px] text-gov-yellow font-mono tracking-widest block font-bold uppercase">
                {techProfile?.departmentName || "Field Technician"}
              </span>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs">
            <button
              id="tech-tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "dashboard" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard Overview</span>
            </button>

            <button
              id="tech-tab-assigned"
              onClick={() => setActiveTab("assigned")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all relative ${
                activeTab === "assigned" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Wrench size={16} />
              <span>Assigned Complaints</span>
              {activeJobsCount > 0 && (
                <span className="absolute right-3 bg-gov-yellow text-slate-950 font-mono font-black px-1.5 py-0.5 rounded-full text-[9px]">
                  {activeJobsCount}
                </span>
              )}
            </button>

            <button
              id="tech-tab-schedule"
              onClick={() => setActiveTab("schedule")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "schedule" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Calendar size={16} />
              <span>Duty Schedule</span>
            </button>

            <button
              id="tech-tab-completed"
              onClick={() => setActiveTab("completed")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "completed" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <CheckCircle2 size={16} />
              <span>Completed Jobs</span>
            </button>

            <button
              id="tech-tab-notifications"
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "notifications" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Bell size={16} />
              <span>Notifications</span>
              {notifications.filter(n => !n.isRead).length > 0 && (
                <span className="ml-auto bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>

            <button
              id="tech-tab-profile"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "profile" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <UserIcon size={16} />
              <span>My Profile</span>
            </button>

            <div className="border-t border-slate-800 my-2 pt-2">
              <span className="px-4 text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Advanced Modules</span>
            </div>

            <button
              id="tech-tab-chat"
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "chat" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <MessageSquare size={16} />
              <span>Internal Chat</span>
            </button>

            <button
              id="tech-tab-calendar"
              onClick={() => setActiveTab("calendar")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "calendar" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Calendar size={16} />
              <span>Scheduler</span>
            </button>

            <button
              id="tech-tab-gis"
              onClick={() => setActiveTab("gis")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "gis" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Map size={16} />
              <span>Interactive GIS</span>
            </button>

            <button
              id="tech-tab-documents"
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "documents" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Folder size={16} />
              <span>Repository</span>
            </button>

            <button
              id="tech-tab-digital-forms"
              onClick={() => setActiveTab("digital_forms")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "digital_forms" ? "bg-gov-blue text-white shadow-md" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Clipboard size={16} />
              <span>Digital Forms</span>
            </button>
          </nav>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-950/40">
          <button
            id="tech-logout-btn"
            onClick={onLogout}
            className="w-full flex items-center space-x-3 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider py-2 rounded text-xs transition-colors"
          >
            <LogOut size={16} />
            <span>Logout Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-grow p-6 sm:p-8 space-y-6 overflow-y-auto max-h-screen">
        
        {/* Header ribbon */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 sm:space-y-0">
          <div>
            <span className="text-[10px] font-mono tracking-wider bg-gov-yellow text-slate-900 px-2 py-1 rounded font-bold uppercase">
              Thulamela CRM Field Terminal
            </span>
            <h1 className="text-2xl font-black text-slate-900 uppercase mt-1">
              {activeTab === "dashboard" && "Technician Cockpit"}
              {activeTab === "assigned" && "Active Field Duty"}
              {activeTab === "schedule" && "Maintenance Schedule"}
              {activeTab === "completed" && "Historical Resolution Log"}
              {activeTab === "profile" && "Technical Personnel File"}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Field Specialist: <strong>{currentUser.name}</strong> • Depot Assignment: Sibasa Workshop
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Cloud Sync Status */}
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              syncState === "synced" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                : syncState === "syncing"
                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}>
              <span className={`w-2 h-2 rounded-full inline-block ${
                syncState === "synced" ? "bg-emerald-500" : syncState === "syncing" ? "bg-amber-500" : "bg-slate-400"
              }`}></span>
              <span>{syncState === "synced" ? "Cloud Synced" : syncState === "syncing" ? "Syncing Cloud..." : "Offline Cache"}</span>
            </div>

            <div className="flex items-center space-x-3 text-xs bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
              <Calendar size={14} className="text-gov-blue" />
              <span className="font-bold font-mono text-slate-700">
                {new Date().toLocaleDateString("en-ZA", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        {/* TAB 1: TECH OVERVIEW */}
        {activeTab === "dashboard" && (
          <div id="tech-pane-dashboard" className="space-y-6">
            
            {/* KPI Metrics row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <div className="text-slate-400 flex justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Total Allocated</span>
                  <Wrench size={16} />
                </div>
                <span className="text-2xl font-black text-slate-900 font-mono">{complaints.length}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Lifetime Job Tickets</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <div className="text-amber-500 flex justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider">Pending/Active</span>
                  <Clock size={16} />
                </div>
                <span className="text-2xl font-black text-slate-900 font-mono">{activeJobsCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">In Progress or Waiting</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <div className="text-emerald-500 flex justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Resolved Jobs</span>
                  <CheckCircle2 size={16} />
                </div>
                <span className="text-2xl font-black text-slate-900 font-mono">{resolvedJobsCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Successfully Fixed</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
                <div className="text-gov-blue flex justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-gov-blue tracking-wider">Status Rank</span>
                  <Sparkles size={16} />
                </div>
                <span className="text-lg font-black text-slate-900 uppercase">
                  {techProfile?.status === "available" && "Available"}
                  {techProfile?.status === "busy" && "Busy"}
                  {techProfile?.status === "on_leave" && "On Leave"}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">My Attendance Index</span>
              </div>
            </div>

            {/* Quick assigned panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Critical active dockets list */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-950 text-xs uppercase tracking-wider flex items-center">
                    <Wrench className="mr-2 text-gov-blue" size={16} />
                    <span>My Active Field Assignments ({activeJobsCount})</span>
                  </h3>
                  <button 
                    onClick={() => setActiveTab("assigned")}
                    className="text-[10px] text-gov-blue font-bold uppercase hover:underline"
                  >
                    View All
                  </button>
                </div>

                {complaints.filter(c => c.status !== "Resolved" && c.status !== "Closed" && c.status !== "Rejected" && c.status !== "Cancelled").length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-slate-400 font-bold text-xs">No active field duties assigned to you currently.</p>
                    <p className="text-[11px] text-slate-400">Dispatch will alert you when new councillor dockets are synchronized.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {complaints
                      .filter(c => c.status !== "Resolved" && c.status !== "Closed" && c.status !== "Rejected" && c.status !== "Cancelled")
                      .map(comp => (
                        <div 
                          key={comp.id} 
                          className="p-4 border border-slate-100 bg-slate-50/60 rounded-xl hover:border-slate-200 transition-all cursor-pointer flex justify-between items-center"
                          onClick={() => { setSelectedComplaint(comp); }}
                        >
                          <div className="space-y-1 max-w-md">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                                {comp.id}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                comp.priority === "Critical" || comp.priority === "Emergency" ? "bg-red-100 text-red-800 animate-pulse" : "bg-blue-100 text-blue-800"
                              }`}>
                                {comp.priority}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 font-mono">
                                {comp.category}
                              </span>
                            </div>
                            <h4 className="font-black text-slate-900 text-xs uppercase truncate">{comp.title}</h4>
                            <p className="text-[11px] text-slate-500 font-bold flex items-center">
                              <MapPin size={11} className="mr-1 text-slate-400" />
                              <span>Ward {comp.wardNumber} ({comp.wardName}), Village: {comp.village || "Makwarela"}</span>
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 uppercase block text-center">
                              {comp.status}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                              Reported: {new Date(comp.dateCreated).toLocaleDateString("en-ZA")}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Duty Schedule & Depot Details */}
              <div className="lg:col-span-4 bg-slate-900 text-white rounded-2xl p-5 space-y-4">
                <h3 className="font-black text-xs uppercase tracking-wider text-gov-yellow border-b border-slate-800 pb-2">
                  Emergency Protocols
                </h3>
                
                <div className="space-y-3.5 text-[11px]">
                  <div className="p-3 bg-slate-800/80 rounded-xl space-y-1.5 border border-slate-700/50">
                    <span className="text-slate-400 uppercase tracking-wider block text-[9px] font-mono font-bold">Depot Standby Duty</span>
                    <p className="font-bold">Monday - Friday: 08:00 - 16:30</p>
                    <p className="text-slate-400">Emergency Standby: 24 Hours on rotation.</p>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl space-y-1 border border-slate-700/50">
                    <span className="text-slate-400 uppercase tracking-wider block text-[9px] font-mono font-bold">Water Main Line Repair</span>
                    <p className="text-slate-200">Boreholes & Main feeders have SLA of 24 Hours for severe outages.</p>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl space-y-1 border border-slate-700/50">
                    <span className="text-slate-400 uppercase tracking-wider block text-[9px] font-mono font-bold">Contact Logistics Desk</span>
                    <p className="font-mono font-bold text-gov-yellow">015 962 7611</p>
                    <p className="text-slate-400">Ask for Depot Logistics Supervisor Mudau.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: ALLOCATED CASES */}
        {activeTab === "assigned" && (
          <div id="tech-pane-assigned" className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 uppercase">My Assigned Complaints Queue</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Below are all service delivery complaints currently assigned to you for inspection, repair, or resolution.</p>
            </div>

            {complaints.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-slate-400 font-bold">No complaints mapped to your technicians credentials.</p>
                <p className="text-xs text-slate-500">Contact admin dispatch if this is an error.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.map(comp => (
                  <div 
                    key={comp.id} 
                    className="p-5 border border-slate-100 rounded-xl bg-slate-50 hover:bg-white hover:border-slate-200 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
                  >
                    <div className="space-y-1.5 flex-grow max-w-xl">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-mono font-black text-xs text-gov-blue bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                          {comp.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          comp.priority === "Critical" || comp.priority === "Emergency" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          Priority: {comp.priority}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                          {comp.category} • {comp.subCategory || "General Outage"}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-950 uppercase text-xs sm:text-sm">{comp.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{comp.description}</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[10px] text-slate-500 pt-2 font-bold font-mono">
                        <div>
                          <span className="text-slate-400 uppercase block font-sans text-[8px]">Ward Location</span>
                          <span>Ward {comp.wardNumber} ({comp.wardName})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase block font-sans text-[8px]">Reporting Councillor</span>
                          <span>{comp.reporterName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase block font-sans text-[8px]">Reporting Date</span>
                          <span>{new Date(comp.dateCreated).toLocaleDateString("en-ZA")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase block font-sans text-[8px]">GPS Area Location</span>
                          <span>{comp.village || "Makwarela"} / {comp.landmark || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-stretch sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 min-w-36">
                      <span className="px-3 py-1 rounded text-center text-[10px] font-bold bg-amber-100 text-amber-800 uppercase block">
                        {comp.status}
                      </span>
                      
                      <button
                        onClick={() => setSelectedComplaint(comp)}
                        className="px-4 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white font-bold text-[10px] uppercase rounded-lg shadow-sm transition-all text-center"
                      >
                        Open Docket File
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULE */}
        {activeTab === "schedule" && (
          <div id="tech-pane-schedule" className="bg-white rounded-2xl border border-slate-100 p-5 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 uppercase">My Daily Duty & Schedule Grid</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Synchronized with Thulamela civic logistics dispatch. Ensure site logs are captured promptly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-100 bg-slate-50/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-400 uppercase">08:30 - 11:00</span>
                  <span className="bg-blue-100 text-blue-800 text-[8px] font-black uppercase px-2 py-0.5 rounded">Inspection</span>
                </div>
                <h4 className="font-black text-slate-900 text-xs uppercase">Site Inspection & Survey</h4>
                <p className="text-[11px] text-slate-500">Conduct physical layout diagnostics of new councillor dockets mapped this morning.</p>
              </div>

              <div className="p-4 border border-slate-100 bg-slate-50/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-400 uppercase">11:30 - 14:00</span>
                  <span className="bg-amber-100 text-amber-800 text-[8px] font-black uppercase px-2 py-0.5 rounded">Active Repair</span>
                </div>
                <h4 className="font-black text-slate-900 text-xs uppercase">Depot Hardware Requisition</h4>
                <p className="text-[11px] text-slate-500">Collect pipes, transformers, or tools approved under waiting material requisitions.</p>
              </div>

              <div className="p-4 border border-slate-100 bg-slate-50/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-400 uppercase">14:30 - 16:30</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase px-2 py-0.5 rounded">Site Execution</span>
                </div>
                <h4 className="font-black text-slate-900 text-xs uppercase">Field Site Resolution</h4>
                <p className="text-[11px] text-slate-500">Execute trenching, valve fittings, electrical line splices, and log completion reports.</p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[10px]">Depot Transport Logistics Notice</h4>
              <p className="text-slate-600 leading-relaxed">
                Municipal fleet vehicle <strong>(Toyota Hilux 2.4 GD-6 - Fleet ID: TLM-W04)</strong> has been logged to your credentials for the current shift cycle. Ensure fuel logbooks are filled out daily at Sibasa Workshop depot before signing off shift at 16:30.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: COMPLETED JOBS */}
        {activeTab === "completed" && (
          <div id="tech-pane-completed" className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 uppercase">My Historical Resolution Record</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Archived list of service delivery complaints resolved by your department specialists.</p>
            </div>

            {complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 font-bold">No resolved files found in your historic logbook.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {complaints
                  .filter(c => c.status === "Resolved" || c.status === "Closed")
                  .map(comp => (
                    <div key={comp.id} className="p-4 border border-emerald-100 bg-emerald-50/20 rounded-xl flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                            {comp.id}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-bold">
                            {comp.category}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-xs uppercase">{comp.title}</h4>
                        <p className="text-[11px] text-slate-600 italic">Resolution: "{comp.resolutionNotes || "Restored successfully."}"</p>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          comp.status === "Closed" ? "bg-slate-200 text-slate-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {comp.status === "Closed" ? "CLOSED (VERIFIED)" : "RESOLVED"}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Date: {new Date(comp.dateUpdated).toLocaleDateString("en-ZA")}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === "profile" && techProfile && (
          <div id="tech-pane-profile" className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-4">
                <img 
                  src={currentUser.profilePicture || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"} 
                  alt="" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-gov-yellow" 
                />
                <div>
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{currentUser.name}</h2>
                  <p className="text-xs text-slate-500 font-bold">{techProfile.departmentName} Dept • Employee ID: {currentUser.employeeNumber || "TLM-TECH-109"}</p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded">
                Active Duty Service File
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <h3 className="font-black text-slate-950 uppercase border-b border-slate-100 pb-1.5">Employment Particulars</h3>
                
                <div className="grid grid-cols-2 gap-4 font-bold">
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Telephone Contact</span>
                    <span className="text-slate-800 font-mono">{techProfile.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Email Address</span>
                    <span className="text-slate-800 font-mono">{techProfile.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Assigned Area</span>
                    <span className="text-slate-800">Thohoyandou Precinct A & B</span>
                  </div>
                  <div>
                    <span className="text-slate-400 uppercase text-[9px] block">Core Skills & Specialties</span>
                    <span className="text-slate-800">Pipe diagnostics, Heavy water mains</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-black text-slate-950 uppercase border-b border-slate-200 pb-1.5">Shift Performance Index</h3>
                
                <div className="space-y-3 font-semibold text-slate-700">
                  <div className="flex justify-between">
                    <span>Lifetime resolved complaints</span>
                    <span className="font-bold font-mono">{techProfile.completedTasks} dockets</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active tasks assigned</span>
                    <span className="font-bold font-mono">{techProfile.activeTasks} active</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Satisfaction Rating (Wards)</span>
                    <span className="font-bold text-gov-green">94% Positive Index</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div id="tab-pane-notifications" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                  <Bell className="mr-2 text-gov-yellow" size={22} />
                  <span>Notification Center</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Receive immediate automated alerts regarding complaint assignments, updates, and municipal notices.</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAllNotifications}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg uppercase tracking-wider"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-bold">
                  Your notification archive is completely empty.
                </div>
              ) : (
                notifications.map((n) => (
                  <div 
                    key={n.id}
                    className={`p-4 rounded-xl border text-xs flex justify-between items-start leading-relaxed transition-all ${
                      !n.isRead ? "bg-amber-50/40 border-l-4 border-l-gov-yellow border-slate-200" : "bg-slate-50/40 border-slate-100"
                    }`}
                  >
                    <div className="space-y-1 flex-1 pr-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider ${
                        n.type === "success" ? "bg-emerald-100 text-emerald-800"
                          : n.type === "alert" ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {n.type}
                      </span>
                      <h4 className="font-bold text-slate-950 text-sm mt-1">{n.title}</h4>
                      <p className="text-slate-600 mt-0.5">{n.message}</p>
                      {n.complaintId && (
                        <button
                          onClick={() => {
                            const comps = getComplaints();
                            const matched = comps.find(c => c.id === n.complaintId);
                            if (matched) setSelectedComplaint(matched);
                          }}
                          className="text-gov-blue hover:underline font-bold font-mono text-[10px] mt-1.5 block"
                        >
                          View Related Ticket {n.complaintId} →
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-1">
                      <button
                        onClick={() => handleDismissNotification(n.id)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(n.timestamp).toLocaleDateString("en-ZA")} {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <InternalChat 
            currentUser={currentUser} 
            onAddToast={onAddToast} 
            initialActiveRoomId={activeChatRoomId}
          />
        )}

        {activeTab === "calendar" && (
          <MunicipalCalendar currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "gis" && (
          <InteractiveGIS currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "documents" && (
          <DocumentManager currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "digital_forms" && (
          <DigitalForms currentUser={currentUser} onAddToast={onAddToast} />
        )}

      </main>

      {/* TICKET DETAILS MODAL */}
      {selectedComplaint && (
        <div id="tech-complaint-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 border-b-4 border-gov-yellow flex justify-between items-center flex-shrink-0">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-gov-yellow bg-slate-800 px-2 py-1 rounded">
                  {selectedComplaint.id}
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight truncate max-w-md">{selectedComplaint.title}</h3>
                  <span className="text-[10px] text-slate-400 block font-mono">Ward {selectedComplaint.wardNumber} - {selectedComplaint.wardName}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-grow text-xs">
              
              {/* Actions Ribbon */}
              <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex flex-wrap gap-2 justify-start items-center">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-2">Docket Actions:</span>
                
                {selectedComplaint.status === "Assigned" && (
                  <>
                    <button 
                      onClick={() => handleAcceptAssignment(selectedComplaint.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded text-[9px] shadow-sm transition-all flex items-center space-x-1"
                    >
                      <Check size={10} />
                      <span>Accept Ticket</span>
                    </button>
                    <button 
                      onClick={() => setShowRejectModal(true)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded text-[9px] shadow-sm transition-all"
                    >
                      Reject docket
                    </button>
                  </>
                )}

                {selectedComplaint.status === "In Progress" && (
                  <>
                    <button 
                      onClick={() => {
                        setProgressPercent(50);
                        setShowProgressModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase rounded text-[9px] shadow-sm transition-all flex items-center space-x-1"
                    >
                      <Upload size={10} />
                      <span>Log Progress %</span>
                    </button>

                    <button 
                      onClick={() => setShowMaterialModal(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase rounded text-[9px] shadow-sm transition-all"
                    >
                      Request Materials
                    </button>

                    <button 
                      onClick={() => setShowCompletionModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase rounded text-[9px] shadow-sm transition-all flex items-center space-x-1"
                    >
                      <CheckCircle size={10} />
                      <span>Mark Work Complete</span>
                    </button>
                  </>
                )}

                <button 
                  onClick={() => setShowInfoModal(true)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold uppercase rounded text-[9px] transition-all flex items-center space-x-1"
                >
                  <HelpCircle size={10} />
                  <span>Request Info</span>
                </button>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 font-bold">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider font-mono">Current Status</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase inline-block mt-1">
                    {selectedComplaint.status}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider font-mono">Priority Level</span>
                  <p className="text-red-700 uppercase mt-1">{selectedComplaint.priority}</p>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider font-mono">Emergency Level</span>
                  <p className="text-red-700 uppercase mt-1">{selectedComplaint.emergencyLevel || 'Medium'}</p>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-400 block tracking-wider font-mono">Reporting Councillor</span>
                  <p className="text-slate-900 mt-1">{selectedComplaint.reporterName}</p>
                  {selectedComplaint.reporterId && (
                    <button
                      onClick={() => handleStartCouncillorChat(selectedComplaint)}
                      className="mt-1.5 flex items-center space-x-1 px-2 py-1 bg-gov-green hover:bg-gov-green-hover text-white rounded text-[10px] font-bold transition-all shadow-sm"
                    >
                      <MessageSquare size={10} />
                      <span>Chat feedback</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <h4 className="font-black text-slate-950 uppercase text-[9px] font-mono tracking-wider">Complaint Particulars</h4>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-slate-700 leading-relaxed font-medium">
                  <p className="font-bold text-slate-900 mb-1">Title: {selectedComplaint.title}</p>
                  <p>{selectedComplaint.description}</p>
                  
                  {/* Detailed Part 2 Address fields inside docket */}
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200 grid grid-cols-2 gap-3 text-[10px] font-bold font-mono">
                    <div>
                      <span className="text-slate-400 font-sans block text-[8px] uppercase">Street Address / Landmark</span>
                      <span>{selectedComplaint.streetAddress || "Thohoyandou Main Precinct"} • {selectedComplaint.landmark || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[8px] uppercase">Village & GPS coordinates</span>
                      <span>{selectedComplaint.village || "Makwarela"} • {selectedComplaint.gpsCoordinates || "-22.95, 30.48"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[8px] uppercase">Residents Affected</span>
                      <span>{selectedComplaint.affectedResidents || "150+"} residents estimated</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-sans block text-[8px] uppercase">Contact Method preference</span>
                      <span>{selectedComplaint.preferredContactMethod || "SMS dispatch only"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedComplaint.referencePhoto && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[9px] font-mono tracking-wider mb-1.5">Attached Evidence Reference</h4>
                  <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-100">
                    <img src={selectedComplaint.referencePhoto} alt="Ref photo" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              {/* Resolution Notes */}
              {selectedComplaint.resolutionNotes && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl space-y-1">
                  <h4 className="font-bold text-emerald-800 uppercase text-[9px] font-mono tracking-wider">Active Progress/Resolution Notes</h4>
                  <p className="text-emerald-700 leading-relaxed font-bold">
                    {selectedComplaint.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Timeline Logs */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[9px] font-mono tracking-wider">Inquiry Tracking History</h4>
                <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4 font-semibold text-slate-700">
                  {selectedComplaint.logs.map((log, idx) => (
                    <div key={log.id || idx} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-gov-blue border-2 border-white"></span>
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-slate-400 block">
                          {new Date(log.timestamp).toLocaleDateString("en-ZA")} {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <h5 className="font-bold text-slate-950">{log.action}</h5>
                        <p className="text-slate-500 text-[11px] leading-tight">{log.note}</p>
                        <span className="text-[9px] text-slate-400 uppercase font-mono block">Operator: {log.userName} ({log.userRole})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments Section */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[9px] font-mono tracking-wider flex items-center justify-between">
                  <span>Councillor & Department Chat Logs</span>
                  <span className="text-slate-400 font-mono">({selectedComplaint.comments.length} entries)</span>
                </h4>

                <div className="space-y-3 max-h-[150px] overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedComplaint.comments.length === 0 ? (
                    <p className="text-center py-4 text-slate-400 text-[11px]">No feedback comments appended yet. Communicate with the Councillor below.</p>
                  ) : (
                    selectedComplaint.comments.map((com) => (
                      <div key={com.id} className="bg-white border border-slate-100 p-2.5 rounded-lg space-y-1 shadow-sm font-semibold">
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                          <span>{com.userName} ({com.userRole.toUpperCase()})</span>
                          <span>{new Date(com.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-700 leading-normal">{com.message}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Post New Comment */}
                <div className="flex space-x-2 pt-1.5">
                  <input
                    type="text"
                    placeholder="Type message for the Ward Councillor..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue focus:bg-white transition-all font-bold text-base"
                  />
                  <button
                    onClick={() => handleAddComment(selectedComplaint.id)}
                    className="px-4 bg-gov-blue hover:bg-gov-blue-hover text-white rounded-lg flex items-center justify-center shadow-sm"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center flex-shrink-0">
              <span className="text-[9px] font-mono text-slate-400">THULAMELA CRM • FIELD SPECIALIST ACCESS</span>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase rounded-lg transition-all"
              >
                Close File
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {showRejectModal && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-slate-950 uppercase text-xs tracking-wider">Reject Docket Assignment</h3>
            <p className="text-xs text-slate-500">Provide an administrative explanation of why your team cannot execute this task (e.g. out of ward boundaries, requires private subcontractor).</p>
            
            <textarea
              rows={3}
              placeholder="Enter comprehensive rejection reasoning..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
            />

            <div className="flex justify-end space-x-2 text-xs font-bold">
              <button 
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleRejectAssignment(selectedComplaint.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg uppercase"
              >
                Reject Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST INFO MODAL */}
      {showInfoModal && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-slate-950 uppercase text-xs tracking-wider">Request Supplementary Details</h3>
            <p className="text-xs text-slate-500">Councillor {selectedComplaint.reporterName} will be alerted to append information regarding landmarks, contacts, or photos.</p>
            
            <textarea
              rows={3}
              placeholder="e.g. Please provide a close landmark or a contact phone of a resident at the corner..."
              value={additionalInfoText}
              onChange={(e) => setAdditionalInfoText(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
            />

            <div className="flex justify-end space-x-2 text-xs font-bold">
              <button 
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleRequestInfo(selectedComplaint.id)}
                className="px-4 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white rounded-lg uppercase"
              >
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROGRESS LOG MODAL */}
      {showProgressModal && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-slate-950 uppercase text-xs tracking-wider">Log Field Site Progress</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Percentage Completed ({progressPercent}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="10"
                  value={progressPercent}
                  onChange={(e) => setProgressPercent(Number(e.target.value))}
                  className="w-full accent-gov-blue cursor-pointer h-2 bg-slate-200 rounded-lg text-base"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
                  <span>0% (Inspecting)</span>
                  <span>50% (Active Work)</span>
                  <span>100% (Finished)</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Estimated Completion Date (Optional)</label>
                <input
                  type="date"
                  value={estCompletionDate}
                  onChange={(e) => setEstCompletionDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold font-mono text-base"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Upload Field Media</label>
                <div className="flex space-x-1 mb-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setProgressMediaType("photo");
                      setProgressFiles([]);
                    }}
                    className={`flex-1 p-1.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center justify-center ${
                      progressMediaType === "photo" ? "bg-gov-blue text-white" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <Upload size={10} className="mr-1" /> Photo
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setProgressMediaType("video");
                      setProgressFiles([]);
                    }}
                    className={`flex-1 p-1.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center justify-center ${
                      progressMediaType === "video" ? "bg-gov-blue text-white" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <Play size={10} className="mr-1" /> Video
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setProgressMediaType("voicenote");
                      setProgressFiles([]);
                    }}
                    className={`flex-1 p-1.5 rounded border text-[9px] font-bold uppercase tracking-wider flex items-center justify-center ${
                      progressMediaType === "voicenote" ? "bg-gov-blue text-white" : "bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <Volume2 size={10} className="mr-1" /> Voice Note
                  </button>
                </div>

                <FileUploader
                  files={progressFiles}
                  setFiles={handleProgressFilesChange}
                  maxFiles={1}
                  allowedTypes={getProgressAllowedTypes()}
                  onAddToast={onAddToast}
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status Site Notes *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Trenches fully prepared, waiting for cement coupling..."
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-base"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 text-xs font-bold pt-2">
              <button 
                onClick={() => setShowProgressModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleUpdateProgress(selectedComplaint.id)}
                className="px-4 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white rounded-lg uppercase"
              >
                Commit Progress
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUISITION MODAL */}
      {showMaterialModal && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-slate-950 uppercase text-xs tracking-wider">Depot Material Requisition</h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Material Category / Type</label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-base"
                >
                  <option value="PVC Water Pipes 110mm">PVC Water Pipes 110mm</option>
                  <option value="Heavy Duty Couplings">Heavy Duty Couplings</option>
                  <option value="Submersible Borehole Pump 1.5kW">Submersible Borehole Pump 1.5kW</option>
                  <option value="Electrical Cable 3-Core 16mm">Electrical Cable 3-Core 16mm</option>
                  <option value="Cold Asphalt Premix 25kg">Cold Asphalt Premix 25kg</option>
                  <option value="Street Light Lamp LED 150W">Street Light Lamp LED 150W</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 font-bold">
                <div>
                  <label className="text-slate-700 block mb-1">Required Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={materialQty}
                    onChange={(e) => setMaterialQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-base"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1">Preferred Supplier Depot</label>
                  <input
                    type="text"
                    value={materialSupplier}
                    onChange={(e) => setMaterialSupplier(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-base"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 text-xs font-bold pt-2">
              <button 
                onClick={() => setShowMaterialModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleRequestMaterials(selectedComplaint.id)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-lg uppercase"
              >
                Request Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK WORK COMPLETE / COMPLETION REPORT MODAL */}
      {showCompletionModal && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-black text-slate-950 uppercase text-xs tracking-wider">Formal Work Completion Report</h3>
            
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 font-bold">
                <div>
                  <label className="text-slate-400 uppercase text-[8px] block">Time Spent on-site (Hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={completionHours}
                    onChange={(e) => setCompletionHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-base"
                  />
                </div>

                <div>
                  <label className="text-slate-400 uppercase text-[8px] block">Materials & Spares Used</label>
                  <input
                    type="text"
                    placeholder="e.g. 1x PVC pipe, 2x couplers"
                    value={completionMaterialsUsed}
                    onChange={(e) => setCompletionMaterialsUsed(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold text-base"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 block">Technical Resolution Summary *</label>
                  <button
                    type="button"
                    disabled={isGeneratingResolution}
                    onClick={handleAutoDraftResolution}
                    className="text-[9px] bg-slate-900 text-white hover:bg-slate-800 font-bold px-2 py-1 rounded transition-all uppercase flex items-center space-x-1"
                  >
                    <span>{isGeneratingResolution ? "Drafting..." : "✨ Auto-Draft Resolution"}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide precise technical details of how the issue was fixed..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold leading-normal text-base"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 text-xs font-bold pt-2">
              <button 
                onClick={() => setShowCompletionModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleSubmitCompletionReport(selectedComplaint.id)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg uppercase"
              >
                Transmit Completion Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
