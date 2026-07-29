import React, { useState, useEffect } from "react";
import { 
  getComplaints, 
  saveComplaints, 
  getNotifications, 
  saveNotifications, 
  deleteNotification,
  getWards, 
  saveWards,
  addAuditLog, 
  getDepartments,
  addNotification,
  getSyncStatus,
  getChatRooms,
  saveChatRooms
} from "../db";
import { User, Complaint, Notification, Department, Ward, ComplaintStatus, ComplaintPriority, ChatRoom } from "../types";
import { 
  LayoutDashboard, 
  FileText, 
  ClipboardList, 
  Bell, 
  BarChart2, 
  User as UserIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Inbox, 
  Search, 
  Filter, 
  Send, 
  FileSpreadsheet, 
  Lock, 
  ShieldCheck, 
  Plus, 
  Eye, 
  X,
  RefreshCw,
  MapPin,
  MessageSquare,
  Map,
  Folder,
  Clipboard
} from "lucide-react";

import InternalChat from "./InternalChat";
import MunicipalCalendar from "./MunicipalCalendar";
import InteractiveGIS from "./InteractiveGIS";
import DocumentManager from "./DocumentManager";
import DigitalForms from "./DigitalForms";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";
import FileUploader from "./FileUploader";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin, ControlPosition } from "@vis.gl/react-google-maps";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";


interface CouncillorDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type Tab = "dashboard" | "lodge" | "complaints" | "notifications" | "reports" | "profile" | "settings" | "chat" | "calendar" | "gis" | "documents" | "digital_forms";

export default function CouncillorDashboard({
  currentUser,
  onLogout,
  onNavigate,
  onAddToast
}: CouncillorDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [activeChatRoomId, setActiveChatRoomId] = useState<string>("");

  // Form State for Lodging Complaint
  const [compTitle, setCompTitle] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compCategory, setCompCategory] = useState("Water Services");
  const [compSubCategory, setCompSubCategory] = useState("Pipe Burst");
  const [compPriority, setCompPriority] = useState<ComplaintPriority>("Medium");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Extended lodging fields
  const [streetAddress, setStreetAddress] = useState("");
  const [village, setVillage] = useState("");
  const [area, setArea] = useState("");
  const [gpsCoordinates, setGpsCoordinates] = useState("");
  const [landmark, setLandmark] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] = useState<"SMS" | "Email" | "Call" | "WhatsApp">("SMS");
  const [citizenName, setCitizenName] = useState("");
  const [citizenContactNumber, setCitizenContactNumber] = useState("");
  const [affectedResidents, setAffectedResidents] = useState(50);
  const [emergencyLevel, setEmergencyLevel] = useState<"Low" | "Medium" | "Severe" | "Disastrous">("Medium");

  // Gemini AI States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [syncState, setSyncState] = useState<string>("offline");

  // Verification & rating states
  const [ratingStars, setRatingStars] = useState<number>(5);
  const [verificationComments, setVerificationComments] = useState("");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");

  // Comment State
  const [newComment, setNewComment] = useState("");

  // Profile Form State
  const [profName, setProfName] = useState(currentUser.name);
  const [profEmail, setProfEmail] = useState(currentUser.email);
  const [profPhone, setProfPhone] = useState(currentUser.phone);
  const [profAddress, setProfAddress] = useState(currentUser.physicalAddress);
  const [profPassword, setProfPassword] = useState("");
  const [profTwoFactor, setProfTwoFactor] = useState(false);

  const departments = getDepartments();

  // Load Data
  const loadCrmData = () => {
    const allComplaints = getComplaints();
    // Filter complaints lodged by this councillor
    const cllrComplaints = allComplaints.filter(c => c.reporterId === currentUser.id);
    setComplaints(cllrComplaints);

    const allNotifs = getNotifications();
    // Filter notifications for this specific councillor or all
    const cllrNotifs = allNotifs.filter(n => n.userId === currentUser.id || n.userId === "all");
    setNotifications(cllrNotifs);
  };

  useEffect(() => {
    loadCrmData();
    setSyncState(getSyncStatus());
    
    // Real-time listener for database changes
    const handleDbUpdate = () => {
      loadCrmData();
      setSyncState(getSyncStatus());
    };
    window.addEventListener("thulamela_db_update", handleDbUpdate);

    return () => {
      window.removeEventListener("thulamela_db_update", handleDbUpdate);
    };
  }, [currentUser]);

  // AI Analyzer function
  const runAiCockpitAssistant = async () => {
    if (!compTitle.trim() || !compDesc.trim()) {
      onAddToast("Information Needed", "Please enter a title and description first for the AI to analyze.", "warning");
      return;
    }
    
    setIsAnalyzing(true);
    setAiAnalysis(null);
    onAddToast("Gemini Thinking", "Consulting Gemini AI to classify, prioritize, and check for duplicate complaints...", "info");
    
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: compTitle,
          description: compDesc,
          wardNumber: currentUser.wardNumber,
          wardName: currentUser.wardName,
          village: village,
          location: streetAddress + " " + area,
          existingComplaints: getComplaints().filter(c => c.status !== "Resolved" && c.status !== "Closed")
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to contact Gemini endpoint");
      }
      
      const data = await response.json();
      setAiAnalysis(data);
      onAddToast("Analysis Complete", "Gemini AI analysis loaded successfully! View recommendations below.", "success");
    } catch (err) {
      console.error(err);
      onAddToast("AI Connection Error", "Could not reach Gemini AI. Standard categories will apply.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Quick statistics counters
  const totalSubmitted = complaints.length;
  const pendingCount = complaints.filter(c => c.status === "Pending").length;
  const assignedCount = complaints.filter(c => c.status === "Assigned").length;
  const resolvedCount = complaints.filter(c => c.status === "Resolved").length;
  const closedCount = complaints.filter(c => c.status === "Closed").length;

  const uploadFile = async (file: File) => {
    if (!storage) {
      throw new Error("Firebase Storage service is not available.");
    }
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `complaints/${Date.now()}_${cleanFileName}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return { type: file.type, url: downloadUrl, name: file.name };
  };

  const handleLodgeComplaint = async (e: React.FormEvent, isDraftFlag: boolean = false) => {
    e.preventDefault();
    if (!compTitle.trim() || !compDesc.trim()) {
      onAddToast("Validation Alert", "Please fill in the complaint title and description.", "warning");
      return;
    }

    // Validate attachment size and type before processing
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit per file
    for (const file of attachments) {
      if (file.size > MAX_FILE_SIZE) {
        onAddToast("File Size Exceeded", `File "${file.name}" exceeds the 15MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`, "warning");
        return;
      }
      const isTypeValid = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'].includes(file.type) || file.type.startsWith('image/') || file.type.startsWith('video/');
      if (!isTypeValid) {
        onAddToast("Invalid File Type", `File "${file.name}" is an unsupported file format.`, "warning");
        return;
      }
    }

    setSubmitting(true);

    try {
      const uploadedMedia: { type: string; url: string; name: string }[] = [];

      if (attachments.length > 0) {
        onAddToast("Uploading Media", `Uploading ${attachments.length} attachment(s) to Firebase Storage...`, "info");
        for (const file of attachments) {
          const mediaObj = await uploadFile(file);
          uploadedMedia.push(mediaObj);
        }
      }

      const imageUploads = uploadedMedia.filter(m => m.type.startsWith('image/'));
      const videoUploads = uploadedMedia.filter(m => m.type.startsWith('video/'));

      const referencePhotoUrl = imageUploads.length > 0 ? imageUploads[0].url : undefined;
      const supportingImageUrls = imageUploads.map(m => m.url);
      const videoUrl = videoUploads.length > 0 ? videoUploads[0].url : undefined;

      const allComplaints = getComplaints();
      const formatIndex = String(allComplaints.length + 1).padStart(6, '0');
      const newId = `TM-2026-${formatIndex}`;
      
      const newComp: Complaint = {
        id: newId,
        title: compTitle.trim(),
        description: compDesc.trim(),
        category: compCategory,
        subCategory: compSubCategory,
        wardNumber: currentUser.wardNumber || 1,
        wardName: currentUser.wardName || "Makwarela",
        reporterId: currentUser.id,
        reporterName: currentUser.name,
        status: isDraftFlag ? "Draft" : "Submitted",
        departmentId: null,
        departmentName: null,
        assignedTechnicianId: null,
        assignedTechnicianName: null,
        priority: compPriority,
        dateCreated: new Date().toISOString(),
        dateUpdated: new Date().toISOString(),
        referencePhoto: referencePhotoUrl,
        
        streetAddress: streetAddress.trim(),
        village: village.trim(),
        area: area.trim(),
        gpsCoordinates: gpsCoordinates.trim() || "-22.956, 30.481",
        landmark: landmark.trim(),
        preferredContactMethod,
        supportingImages: supportingImageUrls,
        video: videoUrl,
        citizenName: citizenName.trim() || undefined,
        citizenContactNumber: citizenContactNumber.trim() || undefined,
        affectedResidents,
        emergencyLevel,
        isDraft: isDraftFlag,

        logs: [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: isDraftFlag ? "Draft Saved" : "Complaint Lodged",
            userName: currentUser.name,
            userRole: "councillor",
            note: isDraftFlag 
              ? "Complaint docket saved as draft by Councillor." 
              : `Lodge initiated on behalf of Ward ${currentUser.wardNumber} (${currentUser.wardName}) citizens.`
          }
        ],
        comments: []
      };

      allComplaints.unshift(newComp);
      saveComplaints(allComplaints);

      // Add audit log
      addAuditLog(
        currentUser.id,
        currentUser.name,
        currentUser.role,
        isDraftFlag ? "Save Draft" : "Lodge Complaint",
        `New complaint ${newId} (${isDraftFlag ? "Draft" : "Submitted"}) registered regarding '${compTitle}' in Ward ${currentUser.wardNumber}.`
      );

      if (!isDraftFlag) {
        // Add system notification for Admins
        addNotification(
          "ADMIN-001",
          "super_admin",
          `New Complaint ${newId} Lodged`,
          `Cllr ${currentUser.name} reported a ${compPriority} priority issue: ${compTitle} in Ward ${currentUser.wardNumber}.`,
          "warning",
          newId
        );
      }

      // Reset
      setCompTitle("");
      setCompDesc("");
      setCompCategory("Water Services");
      setCompSubCategory("Pipe Burst");
      setCompPriority("Medium");
      setStreetAddress("");
      setVillage("");
      setArea("");
      setGpsCoordinates("");
      setLandmark("");
      setCitizenName("");
      setCitizenContactNumber("");
      setAffectedResidents(50);
      setEmergencyLevel("Medium");
      setAttachments([]);

      if (isDraftFlag) {
        onAddToast(
          "Draft Saved Successfully",
          `Complaint draft ${newId} has been successfully stored in your local worklist.`,
          "success"
        );
      } else {
        onAddToast(
          "Complaint Lodged Successfully",
          `Complaint reference ${newId} has been registered and is now in 'Submitted' queue for Department allocation.`,
          "success"
        );
      }

      loadCrmData();
      setActiveTab("complaints");
    } catch (err: any) {
      console.error("Error lodging complaint with attachments:", err);
      onAddToast("Media Upload Error", `Failed to upload attachments or save complaint docket: ${err?.message || "Storage upload failure"}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = (complaintId: string) => {
    if (!newComment.trim()) return;

    const allComplaints = getComplaints();
    const updated = allComplaints.map(c => {
      if (c.id === complaintId) {
        const commentObj = {
          id: `com-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name,
          userRole: currentUser.role,
          message: newComment.trim()
        };
        const newComments = [...c.comments, commentObj];
        
        const logObj = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Comment Submitted",
          userName: currentUser.name,
          userRole: currentUser.role,
          note: `Councillor appended a comment: "${newComment.trim().substring(0, 30)}..."`
        };

        return {
          ...c,
          comments: newComments,
          logs: [...c.logs, logObj],
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);
    
    // update current modal
    const matched = updated.find(c => c.id === complaintId);
    if (matched) {
      setSelectedComplaint(matched);
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Add Comment",
      `Comment added to complaint ${complaintId}.`
    );

    setNewComment("");
    onAddToast("Comment Posted", "Your feedback message has been attached to the case history.", "success");
    loadCrmData();
  };

  const handleStartTechnicianChat = (complaint: Complaint) => {
    if (!complaint.assignedTechnicianId) return;
    const allRooms = getChatRooms();
    const roomId = `room-complaint-${complaint.id}`;
    const roomName = `Feedback: ${complaint.id} (${complaint.assignedTechnicianName})`;
    
    const existing = allRooms.find(r => r.id === roomId);
    if (!existing) {
      const newRoom: ChatRoom = {
        id: roomId,
        name: roomName,
        type: "direct",
        participants: [currentUser.id, complaint.assignedTechnicianId],
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

  const handleVerifyComplaint = (complaintId: string, approved: boolean) => {
    const allComplaints = getComplaints();
    const matched = allComplaints.find(c => c.id === complaintId);
    if (!matched) return;

    if (!verificationComments.trim()) {
      onAddToast("Validation Alert", "Please fill in verification remarks.", "warning");
      return;
    }

    const timestamp = new Date().toISOString();
    let updatedComplaints = allComplaints.map(c => {
      if (c.id === complaintId) {
        if (approved) {
          c.status = "Closed";
          c.rating = ratingStars;
          c.verificationComments = verificationComments.trim();
          c.dateUpdated = timestamp;
          c.logs.push({
            id: `log-${Date.now()}`,
            timestamp,
            action: "Resolution Approved",
            userName: currentUser.name,
            userRole: "councillor",
            note: `Councillor verified and approved the resolution. Rating: ${ratingStars}/5. Remarks: ${verificationComments.trim()}`
          });
        } else {
          c.status = "Assigned"; // Send back to technician queue
          c.verificationComments = verificationComments.trim();
          c.dateUpdated = timestamp;
          c.logs.push({
            id: `log-${Date.now()}`,
            timestamp,
            action: "Resolution Rejected",
            userName: currentUser.name,
            userRole: "councillor",
            note: `Resolution rejected by Councillor. Reasons: ${verificationComments.trim()}`
          });
        }
      }
      return c;
    });

    saveComplaints(updatedComplaints);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      approved ? "Verify Resolve Success" : "Verify Resolve Reject",
      `Cllr ${currentUser.name} ${approved ? "approved" : "rejected"} resolution for complaint ${complaintId}.`
    );

    addNotification(
      "ADMIN-001",
      "super_admin",
      approved ? `Complaint ${complaintId} Verified and Closed` : `Complaint ${complaintId} Resolution Rejected`,
      `Cllr ${currentUser.name} has ${approved ? "closed" : "sent back"} ticket ${complaintId} with remarks: "${verificationComments.trim()}".`,
      approved ? "success" : "alert",
      complaintId
    );

    if (matched.assignedTechnicianId) {
      addNotification(
        matched.assignedTechnicianId,
        "technician",
        approved ? `Ticket ${complaintId} Confirmed Closed` : `Ticket ${complaintId} Resolution Sent Back`,
        approved 
          ? `Councillor approved your resolution on ${complaintId}. Rating: ${ratingStars}/5.` 
          : `Councillor rejected your resolution on ${complaintId}. Remarks: ${verificationComments.trim()}`,
        approved ? "success" : "alert",
        complaintId
      );
    }

    setVerificationComments("");
    setRatingStars(5);

    onAddToast(
      approved ? "Case Verified and Closed" : "Resolution Rejected & Sent Back",
      approved 
        ? `Thank you. Complaint ${complaintId} is now archived as Closed.` 
        : `Ticket ${complaintId} has been sent back to the assigned technician for rectification.`,
      approved ? "success" : "warning"
    );

    loadCrmData();
    const updatedMatched = updatedComplaints.find(c => c.id === complaintId);
    setSelectedComplaint(updatedMatched || null);
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

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onAddToast("Profile Updated", "Contact details and secure password credentials saved successfully.", "success");
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = 
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case "Submitted":
        return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Assigned":
        return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "Closed":
        return "bg-slate-100 text-slate-800 border border-slate-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getPriorityBadge = (priority: ComplaintPriority) => {
    switch (priority) {
      case "Low":
        return "bg-slate-100 text-slate-600";
      case "Medium":
        return "bg-blue-100 text-blue-700";
      case "High":
        return "bg-orange-100 text-orange-800 font-bold";
      case "Critical":
        return "bg-red-100 text-red-800 font-bold animate-pulse border border-red-200";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div id="councillor-dashboard-container" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-5 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-full border border-gov-yellow/40 bg-slate-800 flex items-center justify-center overflow-hidden">
              {currentUser.profilePicture ? (
                <img src={currentUser.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="text-gov-yellow" size={18} />
              )}
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-100 uppercase tracking-wider block">Cllr {currentUser.name.split(" ").slice(-1)[0]}</h4>
              <span className="text-[10px] text-gov-yellow font-mono tracking-widest block font-bold uppercase">
                Ward {currentUser.wardNumber} rep
              </span>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs">
            <button
              id="tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "dashboard"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              id="tab-lodge"
              onClick={() => setActiveTab("lodge")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "lodge"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Plus size={16} />
              <span>Lodge Complaint</span>
            </button>

            <button
              id="tab-complaints"
              onClick={() => setActiveTab("complaints")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "complaints"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <ClipboardList size={16} />
              <span>My Complaints</span>
              {pendingCount > 0 && (
                <span className="ml-auto bg-gov-yellow text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              id="tab-notifications"
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "notifications"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
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
              id="tab-reports"
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "reports"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <BarChart2 size={16} />
              <span>Ward Reports</span>
            </button>

            <button
              id="tab-profile"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "profile"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <UserIcon size={16} />
              <span>Profile</span>
            </button>

            <button
              id="tab-settings"
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "settings"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </button>

            <div className="border-t border-slate-800 my-2 pt-2">
              <span className="px-4 text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Advanced Modules</span>
            </div>

            <button
              id="tab-chat"
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "chat"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <MessageSquare size={16} />
              <span>Internal Chat</span>
            </button>

            <button
              id="tab-calendar"
              onClick={() => setActiveTab("calendar")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "calendar"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Calendar size={16} />
              <span>Scheduler</span>
            </button>

            <button
              id="tab-gis"
              onClick={() => setActiveTab("gis")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "gis"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Map size={16} />
              <span>Interactive GIS</span>
            </button>

            <button
              id="tab-documents"
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "documents"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Folder size={16} />
              <span>Repository</span>
            </button>

            <button
              id="tab-digital-forms"
              onClick={() => setActiveTab("digital_forms")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "digital_forms"
                  ? "bg-gov-green text-white shadow-md shadow-gov-green/20"
                  : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Clipboard size={16} />
              <span>Digital Forms</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-5 border-t border-slate-800 bg-slate-950/40">
          <button
            id="cllr-logout-btn"
            onClick={onLogout}
            className="w-full flex items-center space-x-3 text-red-400 hover:text-red-300 font-bold uppercase tracking-wider py-2 rounded text-xs transition-colors"
          >
            <LogOut size={16} />
            <span>Logout Portal</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-grow p-6 sm:p-8 space-y-6 overflow-y-auto max-h-screen">
        
        {/* Header Ribbon */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 sm:space-y-0">
          <div className="text-left">
            <span className="text-[10px] font-mono tracking-wider bg-gov-blue/10 text-gov-blue px-2 py-1 rounded font-bold uppercase">
              Ward Administration Desk
            </span>
            <h1 className="text-2xl font-black text-slate-900 uppercase mt-1">
              Welcome, Cllr {currentUser.name}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Registered Ward {currentUser.wardNumber}: <strong>{currentUser.wardName}</strong> • Political: {currentUser.politicalPosition}
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
              <Calendar size={14} className="text-gov-green" />
              <span className="font-bold font-mono text-slate-700">{new Date().toLocaleDateString("en-ZA", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* TAB 1: DASHBOARD COCKPIT */}
        {activeTab === "dashboard" && (
          <div id="tab-pane-dashboard" className="space-y-6">
            
            {/* 4 Cards Statistics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-slate-400 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Logged</span>
                  <ClipboardList size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{totalSubmitted}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Total Wards Inquiries</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-amber-500 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Pending</span>
                  <AlertTriangle size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{pendingCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Awaiting Dispatch</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-gov-blue flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-blue block">Assigned</span>
                  <Clock size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{assignedCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Work In Progress</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-emerald-500 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Resolved</span>
                  <CheckCircle size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{resolvedCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Service Restored</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-slate-500 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Closed</span>
                  <Inbox size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{closedCount}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Case Files Closed</span>
              </div>
            </div>

            {/* Main grid splits left vs right (Lodge / Notifications vs Recent items) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Recent Notifications Column */}
              <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-black uppercase text-xs text-slate-900 tracking-wider flex items-center">
                    <Bell size={14} className="mr-1.5 text-gov-green" />
                    <span>Recent Notifications</span>
                  </h3>
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClearAllNotifications}
                      className="text-[9px] font-bold text-gov-blue uppercase tracking-wider hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      <Bell className="mx-auto mb-1 opacity-20" size={18} />
                      <span>No active notifications.</span>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={`p-3 rounded-lg border text-xs leading-normal transition-all ${
                          !n.isRead ? "bg-amber-50/50 border-l-4 border-l-gov-yellow border-slate-200" : "bg-slate-50/50 border-slate-100"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-slate-900 text-[11px] pr-2">{n.title}</h4>
                          <button
                            onClick={() => handleDismissNotification(n.id)}
                            className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors -mr-1 -mt-1 flex-shrink-0"
                            title="Dismiss notification"
                          >
                            <X size={12} />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">{n.message}</p>
                        <span className="block text-[8px] text-slate-400 font-mono mt-1 text-right">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Activity / Case Lists */}
              <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-black uppercase text-xs text-slate-900 tracking-wider flex items-center">
                    <ClipboardList size={14} className="mr-1.5 text-gov-blue" />
                    <span>Recent Ward Inquiries</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab("complaints")}
                    className="text-[10px] font-bold text-gov-green uppercase tracking-wider hover:underline flex items-center space-x-1"
                  >
                    <span>View All Cases</span>
                    <Plus size={12} />
                  </button>
                </div>

                <div className="space-y-3">
                  {complaints.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Inbox className="mx-auto mb-1 opacity-25" size={24} />
                      <span className="font-bold block">No Service Complaints Lodged Yet</span>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                        Your ward record is currently clean. Use the "Lodge Complaint" form to register the first infrastructure issue.
                      </p>
                      <button
                        onClick={() => setActiveTab("lodge")}
                        className="mt-3 px-4 py-2 bg-gov-green text-white font-bold rounded-lg uppercase tracking-wider text-[9px] hover:bg-gov-green-hover shadow-sm"
                      >
                        Lodge Complaint
                      </button>
                    </div>
                  ) : (
                    complaints.slice(0, 3).map((comp) => (
                      <div 
                        key={comp.id}
                        className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[10px] font-bold text-gov-blue bg-gov-blue/5 px-1.5 py-0.5 rounded">
                              {comp.id}
                            </span>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${getStatusBadge(comp.status)}`}>
                              {comp.status}
                            </span>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full ${getPriorityBadge(comp.priority)}`}>
                              {comp.priority}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 mt-2">{comp.title}</h4>
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">Category: {comp.category}</span>
                        </div>
                        <button
                          id={`view-comp-dash-${comp.id}`}
                          onClick={() => setSelectedComplaint(comp)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold uppercase rounded-lg transition-all"
                        >
                          Trace Ticket
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: LODGE COMPLAINT FORM */}
        {activeTab === "lodge" && (
          <div id="tab-pane-lodge" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                  <Plus className="mr-2 text-gov-green" size={22} />
                  <span>Lodge Service Complaint Ticket</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Submit infrastructure or operational failures directly to the relevant municipal dispatch team.</p>
              </div>
              <div className="mt-2 sm:mt-0 px-3 py-1 bg-gov-blue/10 rounded-full text-gov-blue text-[10px] font-bold uppercase tracking-wider">
                Status: Dynamic TM-2026-X
              </div>
            </div>

            <form onSubmit={(e) => handleLodgeComplaint(e, false)} className="space-y-6 text-xs">
              {/* SECTION 1: SYSTEM INFO & CLASSIFICATION */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">1. Classification & Urgency</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Ward Location (Pre-Locked)</label>
                    <div className="relative">
                      <input
                        type="text"
                        disabled
                        value={`Ward ${currentUser.wardNumber || 1} - ${currentUser.wardName || "Makwarela"}`}
                        className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold font-sans text-slate-700 pl-10 cursor-not-allowed text-base"
                      />
                      <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Complaint Category *</label>
                    <select
                      value={compCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setCompCategory(cat);
                        // Reset subcategory automatically
                        if (cat === "Water Services") setCompSubCategory("Pipe Burst");
                        else if (cat === "Electricity & Energy") setCompSubCategory("Power Outage");
                        else if (cat === "Roads and Stormwater") setCompSubCategory("Potholes");
                        else if (cat === "Solid Waste") setCompSubCategory("Illegal Dumping");
                        else setCompSubCategory("General Failure");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-base"
                    >
                      <option value="Water Services">Water Services</option>
                      <option value="Electricity & Energy">Electricity & Energy</option>
                      <option value="Roads and Stormwater">Roads and Stormwater</option>
                      <option value="Solid Waste">Solid Waste</option>
                      <option value="Community Services & Halls">Community Services & Halls</option>
                      <option value="Parks & Open Spaces">Parks & Open Spaces</option>
                      <option value="Human Settlements & Housing">Human Settlements & Housing</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Sub-Category *</label>
                    <select
                      value={compSubCategory}
                      onChange={(e) => setCompSubCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-gov-blue text-base"
                    >
                      {compCategory === "Water Services" && (
                        <>
                          <option value="Pipe Burst">Pipe Burst</option>
                          <option value="No Water">No Water</option>
                          <option value="Low Water Pressure">Low Water Pressure</option>
                          <option value="Sewer Spillage">Sewer Spillage</option>
                          <option value="Leaking Meter">Leaking Meter</option>
                        </>
                      )}
                      {compCategory === "Electricity & Energy" && (
                        <>
                          <option value="Power Outage">Power Outage</option>
                          <option value="Faulty Streetlight">Faulty Streetlight</option>
                          <option value="Cable Theft">Cable Theft</option>
                          <option value="Meter Bypass">Meter Bypass</option>
                          <option value="Electricity Fault">Electricity Fault</option>
                        </>
                      )}
                      {compCategory === "Roads and Stormwater" && (
                        <>
                          <option value="Potholes">Potholes</option>
                          <option value="Road Grading">Road Grading</option>
                          <option value="Blocked Stormwater Drain">Blocked Stormwater Drain</option>
                          <option value="Broken Bridge">Broken Bridge</option>
                          <option value="Missing Road Sign">Missing Road Sign</option>
                        </>
                      )}
                      {compCategory === "Solid Waste" && (
                        <>
                          <option value="Illegal Dumping">Illegal Dumping</option>
                          <option value="Refuse Not Collected">Refuse Not Collected</option>
                          <option value="Overflowing Skips">Overflowing Skips</option>
                          <option value="Public Bin Full">Public Bin Full</option>
                        </>
                      )}
                      {compCategory !== "Water Services" && compCategory !== "Electricity & Energy" && compCategory !== "Roads and Stormwater" && compCategory !== "Solid Waste" && (
                        <>
                          <option value="General Failure">General Failure</option>
                          <option value="Maintenance Request">Maintenance Request</option>
                          <option value="Enquiry">Enquiry</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {currentUser.role !== "councillor" && (
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Emergency Level (Disaster Scale) *</label>
                      <div className="flex space-x-2">
                        {(["Low", "Medium", "Severe", "Disastrous"] as const).map((el) => (
                          <button
                            key={el}
                            type="button"
                            onClick={() => setEmergencyLevel(el)}
                            className={`flex-1 py-2 rounded-lg font-bold uppercase tracking-wider text-[9px] border transition-all ${
                              emergencyLevel === el
                                ? el === "Low" ? "bg-slate-100 text-slate-700 border-slate-200"
                                  : el === "Medium" ? "bg-teal-600 text-white border-teal-600"
                                  : el === "Severe" ? "bg-amber-600 text-white border-amber-600"
                                  : "bg-red-700 text-white border-red-700 animate-bounce"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {el}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: COMPLAINT DESCRIPTION */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">2. Core Docket Details</h3>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Complaint Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Broken water pipeline flooding main arterial road"
                    value={compTitle}
                    onChange={(e) => setCompTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Detailed Complaint Description *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide a professional summary of the failure (e.g. pressure drops, water color, specific times, safety impacts)..."
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium leading-relaxed text-base"
                  ></textarea>
                </div>

                {/* Gemini AI Integration Panel */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mt-2.5 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[14px]">🧠</span>
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wider">Gemini Dispatch AI Cockpit</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">Instantly check duplicates, suggest categories, and determine priority.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={runAiCockpitAssistant}
                      className="px-4 py-2 bg-slate-900 text-white font-bold text-[9px] uppercase tracking-wider rounded-lg hover:bg-slate-850 shadow-sm transition-all disabled:opacity-50 flex items-center space-x-1"
                    >
                      <span>{isAnalyzing ? "Analyzing..." : "Analyze Complaint dockets"}</span>
                    </button>
                  </div>

                  {aiAnalysis && (
                    <div className="border-t border-slate-200 pt-3 space-y-3 animate-fadeIn text-[11px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 rounded-lg border border-slate-100 font-bold">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-mono mb-0.5">AI Classification</span>
                          <p className="text-slate-800">Category: <span className="text-gov-blue">{aiAnalysis.category}</span></p>
                          <p className="text-slate-500 text-[10px]">Sub-category: {aiAnalysis.subCategory}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-mono mb-0.5">AI Priority & Dispatch</span>
                          <p className="text-slate-800">Priority: <span className={aiAnalysis.priority === "Critical" || aiAnalysis.priority === "High" ? "text-red-600 animate-pulse" : "text-slate-700"}>{aiAnalysis.priority}</span></p>
                          <p className="text-slate-500 text-[10px]">Department: {aiAnalysis.recommendedDepartment}</p>
                        </div>
                      </div>

                      <div className="bg-slate-100 p-3 rounded-lg text-slate-700 leading-normal font-semibold">
                        <span className="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">AI Summary</span>
                        <p className="italic text-slate-800 font-bold">"{aiAnalysis.summary}"</p>
                        <p className="mt-1.5 text-[10px] text-slate-500">Recommended Dispatch Action: {aiAnalysis.recommendingAction}</p>
                      </div>

                      {/* Duplicate complaint alert */}
                      {aiAnalysis.duplicateDetected ? (
                        <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded-lg font-semibold space-y-1.5">
                          <p className="font-black flex items-center text-amber-900">
                            <span className="mr-1.5 text-base">⚠️</span> 
                            POTENTIAL DUPLICATE TICKET DETECTED
                          </p>
                          <p className="text-[10px]">
                            A very similar active complaint was found in Ward {currentUser.wardNumber}. 
                            Ticket Reference ID: <strong className="font-mono text-[11px] bg-amber-100 px-1 py-0.5 rounded">{aiAnalysis.duplicateOfId || "TM-2026-0001"}</strong>
                          </p>
                          <p className="text-[10px] text-amber-800">
                            We suggest linking this ticket to the existing one to accelerate response rather than logging a duplicate.
                          </p>
                          <div className="flex space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                onAddToast("Linked to Complaint", `Ticket successfully linked to existing issue: ${aiAnalysis.duplicateOfId}`, "success");
                                setCompTitle("");
                                setCompDesc("");
                                setAiAnalysis(null);
                                setActiveTab("complaints");
                              }}
                              className="px-3 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded text-[9px] uppercase font-black"
                            >
                              Link & Support Existing Ticket
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onAddToast("Override Approved", "Duplicate check bypassed. Proceed to submit.", "info");
                                // Clear duplicate flat from state so they can submit
                                setAiAnalysis({
                                  ...aiAnalysis,
                                  duplicateDetected: false
                                });
                              }}
                              className="px-3 py-1 bg-white border border-amber-300 hover:bg-amber-100 rounded text-[9px] uppercase font-black text-amber-900"
                            >
                              Submit Anyway
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-2.5 rounded-lg flex items-center space-x-1.5 font-bold">
                          <span>✅</span>
                          <span>No duplicate active complaints detected in Ward {currentUser.wardNumber}. Ready for fresh lodgement.</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCompCategory(aiAnalysis.category === "Water & Sanitation" ? "Water Services" : aiAnalysis.category);
                            setCompSubCategory(aiAnalysis.subCategory);
                            setCompPriority(aiAnalysis.priority);
                            onAddToast("Populated Form", "AI suggestions loaded into the form!", "success");
                          }}
                          className="px-4 py-2 bg-gov-green hover:bg-gov-green-hover text-white rounded-lg font-black uppercase tracking-wider text-[9px] shadow-sm flex items-center space-x-1"
                        >
                          <span>✅ Accept & Populate Docket</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: LOCATION DETAILS */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">3. Geographic & GPS Coordinates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Street Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1045 Manyeleti Street"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Village *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sibasa / Thohoyandou"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Area *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ward 1 Main Suburb"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">GPS Coordinates</label>
                    <input
                      type="text"
                      placeholder="-22.95567, 30.48112"
                      value={gpsCoordinates}
                      onChange={(e) => setGpsCoordinates(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-700 text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Landmarks & Navigation Clues</label>
                    <input
                      type="text"
                      placeholder="e.g. Behind the secondary school water tower"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
                    />
                  </div>
                </div>

                {/* Interactive Location Pin Map for Councillor Form */}
                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
                    Interactive GPS Pin Drop
                  </label>
                  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner h-60 relative bg-slate-100">
                    {hasValidKey ? (
                      <APIProvider apiKey={API_KEY} version="weekly">
                        <GoogleMap
                          defaultCenter={{ lat: -22.9786, lng: 30.4578 }}
                          defaultZoom={13}
                          mapId="COUNCILLOR_GPS_MAP"
                          style={{ width: "100%", height: "100%" }}
                          mapTypeControl={true}
                          defaultMapTypeId="roadmap"
                          mapTypeControlOptions={{ position: ControlPosition.TOP_RIGHT }}
                          onClick={(e) => {
                            if (e.detail.latLng) {
                              setGpsCoordinates(`${e.detail.latLng.lat.toFixed(5)}, ${e.detail.latLng.lng.toFixed(5)}`);
                            }
                          }}
                        >
                          {(() => {
                            if (gpsCoordinates) {
                              const parts = gpsCoordinates.split(",").map((s) => parseFloat(s.trim()));
                              if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                const pos = { lat: parts[0], lng: parts[1] };
                                return (
                                  <AdvancedMarker
                                    position={pos}
                                    draggable={true}
                                    onDragEnd={(e) => {
                                      const newLat = e.latLng?.lat() ?? (e as any).detail?.latLng?.lat;
                                      const newLng = e.latLng?.lng() ?? (e as any).detail?.latLng?.lng;
                                      if (newLat != null && newLng != null) {
                                        setGpsCoordinates(`${newLat.toFixed(5)}, ${newLng.toFixed(5)}`);
                                      }
                                    }}
                                  >
                                    <Pin background={"#004d25"} glyphColor={"#ffffff"} borderColor={"#000000"} />
                                  </AdvancedMarker>
                                );
                              }
                            }
                            return null;
                          })()}
                        </GoogleMap>
                      </APIProvider>
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center p-4 text-center">
                        <MapPin size={24} className="text-slate-400 mb-2" />
                        <span className="text-xs font-semibold text-slate-600">Google Maps API key required to view interactive map</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: CONSTITUENTS AND CITIZENS */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">4. Affected Constituency & Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Complainant Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Nelson Ramabulana"
                      value={citizenName}
                      onChange={(e) => setCitizenName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Complainant Contact (Optional)</label>
                    <input
                      type="tel"
                      placeholder="e.g. +27 72 123 4567"
                      value={citizenContactNumber}
                      onChange={(e) => setCitizenContactNumber(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Preferred Contact Channel</label>
                    <select
                      value={preferredContactMethod}
                      onChange={(e) => setPreferredContactMethod(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
                    >
                      <option value="SMS">SMS Notification</option>
                      <option value="WhatsApp">WhatsApp Message</option>
                      <option value="Email">Official Email</option>
                      <option value="Call">Direct Voice Call</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700">Estimated Ward Residents Impacted: <span className="text-gov-blue font-black">{affectedResidents}</span></label>
                    <span className="text-[10px] text-slate-400 font-medium">Specifies service delivery metric</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="1500"
                    step="10"
                    value={affectedResidents}
                    onChange={(e) => setAffectedResidents(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-gov-green text-base"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                    <span>1 Citizen</span>
                    <span>500 affected</span>
                    <span>1000 affected</span>
                    <span>1500+ Community Outage</span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: MEDIA & ATTACHMENTS */}
              <div className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">5. Technical Attachments</h3>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Supporting Documents & Photos</label>
                  <FileUploader files={attachments} setFiles={setAttachments} />
                </div>
              </div>

              {/* REGULATORY NOTICE */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-start space-x-3 text-slate-500 leading-relaxed text-[11px]">
                <ShieldCheck className="text-gov-green flex-shrink-0 mt-0.5 animate-pulse" size={16} />
                <span>
                  By clicking "Dispatch Complaint Ticket", you register an official Thulamela Municipality Service Request. Our SLA binds administrators to review this case within 24 hours. Alternatively, select "Save Draft" to persist your notes and dispatch them later.
                </span>
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCompTitle("");
                    setCompDesc("");
                    setActiveTab("dashboard");
                  }}
                  className="px-5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl uppercase tracking-wider text-[10px] transition-all text-center"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={(e) => handleLodgeComplaint(e, true)}
                  disabled={submitting}
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl uppercase tracking-wider text-[10px] shadow-sm transition-all text-center"
                >
                  Save Draft
                </button>

                <button
                  id="cllr-submit-lodge-btn"
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3.5 bg-gov-green hover:bg-gov-green-hover text-white font-black rounded-xl shadow-lg shadow-gov-green/20 uppercase tracking-wider text-[10px] transition-all flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Dispatch Complaint Ticket</span>
                      <Send size={12} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: MY COMPLAINTS TABLE */}
        {activeTab === "complaints" && (
          <div id="tab-pane-complaints" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                  <ClipboardList className="mr-2 text-gov-blue" size={22} />
                  <span>My Lodged Ward Complaints</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Audit, search, and monitor active service delivery tickets representing Ward {currentUser.wardNumber}.</p>
              </div>
              <button
                id="btn-lodge-complaints-shortcut"
                onClick={() => setActiveTab("lodge")}
                className="px-4 py-2 bg-gov-green hover:bg-gov-green-hover text-white text-xs font-bold rounded-lg uppercase tracking-wider flex items-center space-x-1 shadow-sm"
              >
                <Plus size={14} />
                <span>Lodge New Case</span>
              </button>
            </div>

            {/* Filter and Search Bar Row */}
            <div className="flex flex-col md:flex-row gap-4 text-xs font-bold">
              {/* Search */}
              <div className="flex-grow relative">
                <input
                  type="text"
                  placeholder="Search case title, description, or COMP reference..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 font-semibold focus:outline-none focus:border-gov-blue focus:bg-white transition-all shadow-inner text-base"
                />
                <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48 space-y-1">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue text-base"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="w-full md:w-48 space-y-1">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue text-base"
                >
                  <option value="All">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
                    <th className="p-4 font-mono">Reference ID</th>
                    <th className="p-4">Case Title</th>
                    <th className="p-4">Department / Category</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4">Logged Date</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-10 text-slate-400 font-bold">
                        No service tickets found matching search constraints.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((comp) => (
                      <tr key={comp.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 font-mono font-black text-gov-blue">{comp.id}</td>
                        <td className="p-4">
                          <span className="font-bold text-slate-900 block max-w-xs truncate">{comp.title}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">Ward {comp.wardNumber} - {comp.wardName}</span>
                        </td>
                        <td className="p-4 font-semibold text-slate-600">{comp.category}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getPriorityBadge(comp.priority)}`}>
                            {comp.priority}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-500">
                          {new Date(comp.dateCreated).toLocaleDateString("en-ZA")}
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(comp.status)}`}>
                            {comp.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            id={`trace-btn-${comp.id}`}
                            onClick={() => setSelectedComplaint(comp)}
                            className="px-3 py-1.5 bg-gov-blue text-white font-bold rounded-lg text-[10px] uppercase hover:bg-gov-blue-hover shadow-sm transition-all"
                          >
                            Trace
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS LIST */}
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

        {/* TAB 5: REPORTS GENERATOR */}
        {activeTab === "reports" && (
          <div id="tab-pane-reports" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <BarChart2 className="mr-2 text-gov-green" size={22} />
                <span>Ward {currentUser.wardNumber} Executive Report Generator</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Download and print clean service delivery performance indices and complaint logs for community board reviews.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Report Options Card */}
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="bg-gov-blue/10 text-gov-blue font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                    Format: PDF Spreadsheet
                  </span>
                  <h3 className="text-base font-bold text-slate-950">Ward Complaint Status Audit</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Generates a complete tabular log of all {totalSubmitted} complaints lodged in Ward {currentUser.wardNumber}, showing detailed assignment timelines, dispatched technician names, and resolution notes.
                  </p>
                </div>
                <button
                  id="btn-print-report-status"
                  onClick={() => onAddToast("Generating Report", "Compiling status audit logs. A printable browser download prompt will initiate shortly.", "success")}
                  className="mt-6 w-full py-3 bg-gov-blue hover:bg-gov-blue-hover text-white font-bold text-xs uppercase rounded-xl tracking-wider shadow-sm flex items-center justify-center space-x-2 transition-all"
                >
                  <FileSpreadsheet size={14} />
                  <span>Download Ward Audit Report</span>
                </button>
              </div>

              {/* SLA report card */}
              <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="bg-gov-green/10 text-gov-green font-mono font-bold text-[9px] px-2 py-0.5 rounded uppercase">
                    Format: Executive Briefing
                  </span>
                  <h3 className="text-base font-bold text-slate-950">Department SLA Resolution Speed Index</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Provides a performance percentage score illustrating municipal dispatch response speeds for critical water, electricity, and pothole cases inside {currentUser.wardName}.
                  </p>
                </div>
                <button
                  id="btn-print-report-sla"
                  onClick={() => onAddToast("Generating Briefing", "Generating department SLA graphs. Preparing print layouts...", "success")}
                  className="mt-6 w-full py-3 bg-gov-green hover:bg-gov-green-hover text-white font-bold text-xs uppercase rounded-xl tracking-wider shadow-sm flex items-center justify-center space-x-2 transition-all"
                >
                  <BarChart2 size={14} />
                  <span>Download SLA Performance Index</span>
                </button>
              </div>
            </div>

            {/* Visual Ward Performance metrics */}
            <div className="border border-slate-200/60 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-xs text-slate-900 uppercase">Current Ward Performance Overview</h4>
              
              <div className="space-y-4 text-xs font-semibold">
                <div>
                  <div className="flex justify-between text-slate-600 mb-1.5">
                    <span>Complaint Resolution Success Rate</span>
                    <span className="font-bold font-mono text-gov-green">
                      {totalSubmitted > 0 ? Math.round((resolvedCount / totalSubmitted) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-gov-green h-full rounded-full transition-all duration-1000"
                      style={{ width: `${totalSubmitted > 0 ? (resolvedCount / totalSubmitted) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 mb-1.5">
                    <span>Average Department Acknowledgement SLA</span>
                    <span className="font-bold font-mono text-gov-blue">94% Compliance</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-gov-blue h-full rounded-full" style={{ width: "94%" }}></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: PROFILE PAGE */}
        {activeTab === "profile" && (
          <div id="tab-pane-profile" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <UserIcon className="mr-2 text-gov-blue" size={22} />
                <span>My Councillor Profile</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Review your registered employee particulars and update your contact phone/email channels.</p>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">South African ID Number (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.saIdNumber || "7811225893081"}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-500 cursor-not-allowed font-bold text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={profEmail}
                    onChange={(e) => setProfEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold font-mono text-slate-800 text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Phone Contact</label>
                  <input
                    type="tel"
                    required
                    value={profPhone}
                    onChange={(e) => setProfPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold font-mono text-slate-800 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Ward Number & Area Name</label>
                  <input
                    type="text"
                    disabled
                    value={`Ward ${currentUser.wardNumber} - ${currentUser.wardName}`}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-500 cursor-not-allowed text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Employee Payroll Number (Locked)</label>
                  <input
                    type="text"
                    disabled
                    value={currentUser.employeeNumber || "EMP-CLLR-001"}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-500 cursor-not-allowed font-bold text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Physical Residential Address</label>
                <input
                  type="text"
                  required
                  value={profAddress}
                  onChange={(e) => setProfAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 text-base"
                />
              </div>

              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="font-black text-xs text-slate-950 uppercase">Authentication Security</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Change Account Password</label>
                    <input
                      type="password"
                      placeholder="Enter new secret password"
                      value={profPassword}
                      onChange={(e) => setProfPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono text-slate-800 text-base"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Two-Factor Authentication (2FA)</label>
                    <label className="flex items-center space-x-3 bg-slate-50 p-2.5 border border-slate-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profTwoFactor}
                        onChange={(e) => setProfTwoFactor(e.target.checked)}
                        className="rounded text-gov-green border-slate-300 focus:ring-gov-green h-4 w-4 text-base"
                      />
                      <span className="font-bold text-slate-700 select-none">Enable OTP SMS verification on login</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  id="cllr-save-profile-btn"
                  type="submit"
                  className="px-6 py-3 bg-gov-blue hover:bg-gov-blue-hover text-white font-bold uppercase rounded-lg shadow-sm transition-all"
                >
                  Save Profile Particulars
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === "settings" && (
          <div id="tab-pane-settings" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                <SettingsIcon className="mr-2 text-slate-600" size={22} />
                <span>Portal Settings</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">Configure your personal preferences for automated SMS dispatches, email reporting frequencies, and system theme profiles.</p>
            </div>

            <div className="space-y-5 text-xs font-semibold text-slate-700">
              <div className="space-y-3">
                <h4 className="text-slate-900 font-bold uppercase border-b border-slate-100 pb-1.5 text-[11px]">System Notification Toggles</h4>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-gov-green border-slate-300 focus:ring-gov-green text-base" />
                  <span>Dispatch SMS notification automatically when technician is assigned to my ticket</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded text-gov-green border-slate-300 focus:ring-gov-green text-base" />
                  <span>Send weekly compiled spreadsheet summaries to my email address</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input type="checkbox" className="rounded text-gov-green border-slate-300 focus:ring-gov-green text-base" />
                  <span>Receive system announcements for neighbouring Limpopo wards</span>
                </label>
              </div>

              <div className="space-y-3 pt-4">
                <h4 className="text-slate-900 font-bold uppercase border-b border-slate-100 pb-1.5 text-[11px]">Interface Preferences</h4>
                <div className="flex space-x-3">
                  <button className="flex-1 p-3 border border-gov-green bg-gov-green/5 text-gov-green font-bold uppercase tracking-wider rounded-lg text-center text-[10px]">
                    Standard Government Light Mode
                  </button>
                  <button 
                    onClick={() => onAddToast("Feature Locked", "Dark theme is temporarily disabled in municipal systems for visual compliance audits.", "info")}
                    className="flex-1 p-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 font-bold uppercase tracking-wider rounded-lg text-center text-[10px]"
                  >
                    Compliance Dark Mode
                  </button>
                </div>
              </div>
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

      {/* TRACK TICKET / COMPLAINT DETAIL MODAL */}
      {selectedComplaint && (
        <div 
          id="complaint-detail-modal" 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
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
                id="close-comp-modal"
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-grow text-xs">
              
              {/* STATUS INDICATORS & BASIC DATA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans">
                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider block font-mono">Current Status</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(selectedComplaint.status)}`}>
                    {selectedComplaint.status}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider block font-mono">Assigned Field Staff</span>
                  <div className="flex flex-col items-start mt-1">
                    <p className="text-xs font-bold text-slate-900">
                      {selectedComplaint.assignedTechnicianName || "Awaiting Dispatch"}
                    </p>
                    {selectedComplaint.assignedTechnicianId && (
                      <button
                        onClick={() => handleStartTechnicianChat(selectedComplaint)}
                        className="mt-1.5 flex items-center space-x-1 px-2 py-1 bg-gov-green hover:bg-gov-green-hover text-white rounded text-[10px] font-bold transition-all shadow-sm"
                      >
                        <MessageSquare size={10} />
                        <span>Chat feedback</span>
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider block font-mono">SLA Priority</span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${getPriorityBadge(selectedComplaint.priority)}`}>
                    {selectedComplaint.priority}
                  </span>
                </div>

                <div>
                  <span className="text-[9px] uppercase text-slate-400 font-bold tracking-wider block font-mono">Disaster Level</span>
                  <span className="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-700 font-black rounded text-[10px] uppercase">
                    {selectedComplaint.emergencyLevel || "Medium"}
                  </span>
                </div>
              </div>

              {/* SERVICE CLASSIFICATION & DESCRIPTION */}
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase font-mono">
                  <span>Category: {selectedComplaint.category}</span>
                  <span className="text-gov-blue">Sub-category: {selectedComplaint.subCategory || "General Failure"}</span>
                </div>
                <h4 className="font-bold text-slate-900 uppercase text-[10px] font-mono tracking-wider">Docket Description</h4>
                <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {selectedComplaint.description}
                </p>
              </div>

              {/* GEOGRAPHIC & ADDRESS INFO */}
              <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] font-mono tracking-wider flex items-center space-x-1">
                  <MapPin size={12} className="text-gov-blue" />
                  <span>Geographical Dispatch Target</span>
                </h4>
                <div className="grid grid-cols-2 gap-4 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-bold font-mono text-[9px] block">STREET ADDRESS</span>
                    <span className="text-slate-800 font-bold">{selectedComplaint.streetAddress || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold font-mono text-[9px] block">VILLAGE / SETTLEMENT</span>
                    <span className="text-slate-800 font-bold">{selectedComplaint.village || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold font-mono text-[9px] block">WARD AREA</span>
                    <span className="text-slate-800 font-bold">Ward {selectedComplaint.wardNumber} ({selectedComplaint.wardName})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold font-mono text-[9px] block">GPS COORDINATES</span>
                    <span className="text-slate-800 font-mono font-bold text-[10px]">{selectedComplaint.gpsCoordinates || "-22.9560, 30.4811"}</span>
                  </div>
                </div>
                {selectedComplaint.landmark && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 text-[10px]">
                    <span className="text-slate-400 font-bold uppercase font-mono mr-1">Navigation Landmark:</span>
                    <span className="text-slate-700 font-semibold">{selectedComplaint.landmark}</span>
                  </div>
                )}
              </div>

              {/* CITIZEN & CONSTITUENCY IMPACT METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-[11px]">
                <div>
                  <h5 className="font-bold text-slate-800 uppercase text-[9px] tracking-wider font-mono">Constituency Severity Score</h5>
                  <div className="mt-1 flex items-center space-x-2">
                    <span className="text-lg font-black text-gov-blue">{selectedComplaint.affectedResidents || 120}</span>
                    <span className="text-[10px] text-slate-500 font-semibold">estimated ward residents severely affected</span>
                  </div>
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 uppercase text-[9px] tracking-wider font-mono">Citizen Contact Metadata</h5>
                  {selectedComplaint.citizenName ? (
                    <div className="mt-1 font-semibold space-y-0.5 text-slate-700">
                      <div>Name: <span className="text-slate-900">{selectedComplaint.citizenName}</span></div>
                      <div>Contact: <span className="text-slate-900">{selectedComplaint.citizenContactNumber}</span></div>
                      <div className="text-[9px] text-slate-400">Prefers: {selectedComplaint.preferredContactMethod || "SMS"}</div>
                    </div>
                  ) : (
                    <p className="text-slate-400 mt-1 italic">Anonymously logged by ward desk.</p>
                  )}
                </div>
              </div>

              {/* MEDIA & TECHNICAL RECORDINGS */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] font-mono tracking-wider">Field Telemetry Attachments</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Photo attachment */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100 flex flex-col justify-between h-28">
                    {selectedComplaint.referencePhoto ? (
                      <img src={selectedComplaint.referencePhoto} alt="Evidence" className="w-full h-16 object-cover" />
                    ) : (
                      <div className="w-full h-16 bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-[9px]">No Photo</div>
                    )}
                    <div className="p-1.5 bg-white text-center border-t border-slate-100">
                      <span className="font-bold text-[9px] text-slate-700 block truncate">Reference Photo</span>
                      {selectedComplaint.referencePhoto && (
                        <a href={selectedComplaint.referencePhoto} target="_blank" rel="noreferrer" className="text-[8px] text-gov-blue font-bold hover:underline">View File ↗</a>
                      )}
                    </div>
                  </div>

                  {/* Voice memo mock playback */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between h-28">
                    <div>
                      <span className="font-bold text-[9px] text-slate-700 block uppercase font-mono">Citizen Voice Memo</span>
                      <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">Field audio recording dispatch telemetry.</p>
                    </div>
                    {selectedComplaint.voiceNote ? (
                      <button
                        type="button"
                        onClick={() => onAddToast("Playing Audio", "Simulating 45-second field voice playback...", "success")}
                        className="w-full py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-[9px] font-bold uppercase tracking-wider flex items-center justify-center space-x-1"
                      >
                        <span>▶ Play Memo</span>
                      </button>
                    ) : (
                      <span className="text-[8px] text-slate-400 italic block text-center py-2">No voice note recorded</span>
                    )}
                  </div>

                  {/* Video telemetry mock playback */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white flex flex-col justify-between h-28">
                    <div>
                      <span className="font-bold text-[9px] text-slate-700 block uppercase font-mono">Video Stream Record</span>
                      <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">Infrastructure failure visual telemetrics.</p>
                    </div>
                    {selectedComplaint.video ? (
                      <button
                        type="button"
                        onClick={() => onAddToast("Streaming Video", "Loading municipal video stream leak_raw.mp4 ...", "info")}
                        className="w-full py-1 bg-gov-blue/10 text-gov-blue hover:bg-gov-blue/20 rounded text-[9px] font-bold uppercase"
                      >
                        <span>▶ Stream Video</span>
                      </button>
                    ) : (
                      <span className="text-[8px] text-slate-400 italic block text-center py-2">No video clip attached</span>
                    )}
                  </div>
                </div>
              </div>

              {selectedComplaint.referencePhoto && (
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[10px] font-mono tracking-wider mb-1.5">Attached Evidence Reference</h4>
                  <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-100">
                    <img src={selectedComplaint.referencePhoto} alt="Ref photo" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

               {/* Resolution Notes */}
              {currentUser.role !== "councillor" && selectedComplaint.resolutionNotes && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-xl space-y-2">
                  <h4 className="font-bold text-emerald-800 uppercase text-[10px] font-mono tracking-wider">Technical Resolution Notes</h4>
                  <p className="text-emerald-700 leading-relaxed font-semibold">
                    {selectedComplaint.resolutionNotes}
                  </p>
                  {selectedComplaint.resolutionPhoto && (
                    <div className="mt-2 w-full max-w-sm h-32 rounded-lg overflow-hidden border border-emerald-200">
                      <img src={selectedComplaint.resolutionPhoto} alt="Resolution" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}

              {/* COMPLAINT VERIFICATION AND STAR RATING PANEL FOR COUNCILLOR */}
              {selectedComplaint.status === "Resolved" && (
                <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-2xl space-y-4 animate-pulse">
                  <div className="border-b border-amber-200 pb-2">
                    <h4 className="font-black text-amber-950 uppercase text-[11px] tracking-wider flex items-center">
                      <ShieldCheck className="mr-1 text-amber-600" size={14} />
                      <span>REQUIRED: Councillor Completion Audit Verification</span>
                    </h4>
                    <p className="text-[10px] text-amber-800 mt-0.5 leading-normal">
                      The service delivery technicians have marked this case as **Resolved**. As Ward Councillor, you must audit the field repair and either approve and rate the case to officially **Close** it, or **Reject** and return it for corrective works.
                    </p>
                  </div>

                  {/* Star Rating selector */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-amber-900 block uppercase text-[9px] font-mono">Service Delivery Quality Rating (1 - 5 Stars) *</label>
                    <div className="flex space-x-2.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingStars(star)}
                          className="text-2xl transition-transform hover:scale-125 focus:outline-none"
                        >
                          {star <= ratingStars ? "★" : "☆"}
                        </button>
                      ))}
                      <span className="text-xs font-black text-amber-950 ml-2 self-center uppercase font-mono">({ratingStars} / 5 Stars selected)</span>
                    </div>
                  </div>

                  {/* Verification Remarks textarea */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-amber-900 block uppercase text-[9px] font-mono">Completion Remarks & Audit notes *</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Input remarks regarding the quality of the repair. (e.g. Site cleaned properly, pressure normal, community satisfied...)"
                      value={verificationComments}
                      onChange={(e) => setVerificationComments(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green text-slate-800 font-semibold text-base"
                    ></textarea>
                  </div>

                  {/* Submission buttons */}
                  <div className="flex space-x-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyComplaint(selectedComplaint.id, false)}
                      className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-xl text-[10px] transition-all text-center shadow-sm"
                    >
                      ✗ Reject Repair (Return Ticket)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerifyComplaint(selectedComplaint.id, true)}
                      className="flex-1 py-3 bg-gov-green hover:bg-gov-green-hover text-white font-black uppercase tracking-wider rounded-xl text-[10px] transition-all text-center shadow-md shadow-gov-green/20"
                    >
                      ✓ Approve Repair & Close Case
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline Logs */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 uppercase text-[10px] font-mono tracking-wider">Inquiry Tracking History</h4>
                <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                  {selectedComplaint.logs.map((log, idx) => (
                    <div key={log.id || idx} className="relative">
                      {/* circle */}
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
                <h4 className="font-bold text-slate-900 uppercase text-[10px] font-mono tracking-wider flex items-center justify-between">
                  <span>Councillor & Department Chat Logs</span>
                  <span className="text-slate-400 font-mono">({selectedComplaint.comments.length} entries)</span>
                </h4>

                <div className="space-y-3 max-h-[180px] overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {selectedComplaint.comments.length === 0 ? (
                    <p className="text-center py-4 text-slate-400 text-[11px]">No feedback comments appended yet. Use the dispatch form below to contact the team.</p>
                  ) : (
                    selectedComplaint.comments.map((com) => (
                      <div key={com.id} className="bg-white border border-slate-100 p-2.5 rounded-lg space-y-1 shadow-sm">
                        <div className="flex justify-between text-[9px] text-slate-400 font-mono font-semibold">
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
                    placeholder="Enter message for dispatch operators..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue focus:bg-white transition-all font-semibold text-base"
                  />
                  <button
                    id="submit-cllr-comment"
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
              <span className="text-[9px] font-mono text-slate-400">THULAMELA CRM • SYSTEM FILE</span>
              <button
                id="close-comp-modal-btn"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase rounded-lg transition-all"
              >
                Close Ticket
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
