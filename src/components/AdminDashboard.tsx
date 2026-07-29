import React, { useState, useEffect } from "react";
import { 
  getComplaints, 
  saveComplaints, 
  getWards, 
  saveWards, 
  getUsers, 
  saveUsers, 
  getTechnicians, 
  saveTechnicians,
  getAuditLogs, 
  addAuditLog, 
  getDepartments,
  addNotification,
  getSyncStatus
} from "../db";
import { User, Complaint, Ward, Department, Technician, AuditLog, ComplaintStatus, ComplaintPriority, AccountRequest } from "../types";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { db, auth, isFirebaseEnabled } from "../firebase";
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Building2, 
  Wrench, 
  FileText, 
  BarChart2, 
  Settings as SettingsIcon, 
  ListTodo, 
  LogOut, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  UserPlus, 
  TrendingUp, 
  ShieldCheck, 
  Trash2, 
  Edit3, 
  Printer, 
  ArrowRight, 
  X, 
  ChevronRight, 
  Send,
  MessageSquare,
  Map,
  Folder,
  Clipboard,
  CheckSquare,
  Download
} from "lucide-react";

import InternalChat from "./InternalChat";
import MunicipalCalendar from "./MunicipalCalendar";
import TaskManager from "./TaskManager";
import InteractiveGIS from "./InteractiveGIS";
import ExecutiveDashboardView from "./ExecutiveDashboardView";
import DocumentManager from "./DocumentManager";
import DigitalForms from "./DigitalForms";
import WardManagement from "./WardManagement";
import ServiceNoticeManagement from "./ServiceNoticeManagement";

interface AdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type AdminTab = "dashboard" | "councillors" | "wards" | "departments" | "technicians" | "complaints" | "logs" | "profile" | "settings" | "chat" | "calendar" | "tasks" | "gis" | "executive_dashboard" | "documents" | "digital_forms" | "account_requests" | "service_notices";

export default function AdminDashboard({
  currentUser,
  onLogout,
  onNavigate,
  onAddToast
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [accountRequests, setAccountRequests] = useState<AccountRequest[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);

  // New Councillor Form State
  const [newCllrName, setNewCllrName] = useState("");
  const [newCllrIdNumber, setNewCllrIdNumber] = useState("");
  const [newCllrEmpNumber, setNewCllrEmpNumber] = useState("");
  const [newCllrEmail, setNewCllrEmail] = useState("");
  const [newCllrPhone, setNewCllrPhone] = useState("");
  const [newCllrAddress, setNewCllrAddress] = useState("");
  const [newCllrWard, setNewCllrWard] = useState<number>(3); // default a vacant ward
  const [newCllrPolitical, setNewCllrPolitical] = useState("ANC Ward Councillor");
  const [newCllrUsername, setNewCllrUsername] = useState("");
  const [newCllrPassword, setNewCllrPassword] = useState("");
  const [newCllrConfirmPassword, setNewCllrConfirmPassword] = useState("");
  const [newCllrProfilePic, setNewCllrProfilePic] = useState("");

  // Search & Filter
  const [councillorSearch, setCouncillorSearch] = useState("");
  const [wardSearch, setWardSearch] = useState("");
  const [complaintSearch, setComplaintSearch] = useState("");
  const [complaintStatusFilter, setComplaintStatusFilter] = useState("All");
  const [complaintWardFilter, setComplaintWardFilter] = useState("All");

  // Complaint Operations (Manager dispatch)
  const [dispatchDeptId, setDispatchDeptId] = useState("");
  const [dispatchTechId, setDispatchTechId] = useState("");
  const [dispatchPriority, setDispatchPriority] = useState<ComplaintPriority>("Medium");
  const [dispatchStatus, setDispatchStatus] = useState<ComplaintStatus>("Assigned");
  const [resolutionNotes, setResolutionNotes] = useState("");

  // Edit Ward details
  const [wardEditName, setWardEditName] = useState("");
  const [wardEditCouncillor, setWardEditCouncillor] = useState("");

  // Gemini AI Strategic Insights States
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsData, setInsightsData] = useState<any>(null);
  const [syncState, setSyncState] = useState<string>("offline");

  const departments = getDepartments();

  // Load and refresh
  const loadDashboardData = () => {
    setComplaints(getComplaints());
    setWards(getWards());
    setUsers(getUsers());
    setTechnicians(getTechnicians());
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    loadDashboardData();
    setSyncState(getSyncStatus());

    const handleDbUpdate = () => {
      loadDashboardData();
      setSyncState(getSyncStatus());
    };
    window.addEventListener("thulamela_db_update", handleDbUpdate);

    const interval = setInterval(loadDashboardData, 4000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("thulamela_db_update", handleDbUpdate);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "account_requests") {
      const fetchRequests = async () => {
        const snapshot = await getDocs(collection(db, "accountRequests"));
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccountRequest[];
        setAccountRequests(requests);
      };
      fetchRequests();
    }
  }, [activeTab]);

  const fetchStrategicInsights = async () => {
    setIsInsightsLoading(true);
    setInsightsData(null);
    onAddToast("Gemini Analysis", "Analyzing municipal workload, pending tickets, and technician productivity index...", "info");
    
    try {
      const stats = {
        total: complaints.length,
        pending: complaints.filter(c => c.status === "Pending").length,
        assigned: complaints.filter(c => c.status === "Assigned").length,
        resolved: complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length,
        byCategory: {
          "Water Services": complaints.filter(c => c.category === "Water Services").length,
          "Electricity & Energy": complaints.filter(c => c.category === "Electricity & Energy").length,
          "Roads and Stormwater": complaints.filter(c => c.category === "Roads and Stormwater").length,
          "Solid Waste": complaints.filter(c => c.category === "Solid Waste").length,
        }
      };
      
      const response = await fetch("/api/gemini/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, currentUserRole: currentUser.role })
      });
      
      if (!response.ok) {
        throw new Error("Insights endpoint error");
      }
      
      const data = await response.json();
      setInsightsData(data);
      onAddToast("Insights Generated", "Strategic dashboard insights retrieved successfully!", "success");
    } catch (err) {
      console.error(err);
      onAddToast("Strategic Analysis Error", "Could not fetch AI insights. Showing standard statistics.", "error");
    } finally {
      setIsInsightsLoading(false);
    }
  };

  // Sync ward analytics based on complaints
  const calculateWardComplaints = (wardNum: number) => {
    const wComps = complaints.filter(c => c.wardNumber === wardNum);
    const count = wComps.length;
    const resolved = wComps.filter(c => c.status === "Resolved" || c.status === "Closed").length;
    const pending = count - resolved;
    return { count, resolved, pending };
  };

  // Stats
  const totalComplaints = complaints.length;
  const complaintsPending = complaints.filter(c => c.status === "Pending").length;
  const complaintsAssigned = complaints.filter(c => c.status === "Assigned").length;
  const complaintsResolved = complaints.filter(c => c.status === "Resolved").length;
  const complaintsClosed = complaints.filter(c => c.status === "Closed").length;
  const totalCouncillorsCount = users.filter(u => u.role === "councillor").length;

  const createSecureUserInBackend = async (userData: any) => {
    if (!isFirebaseEnabled || !auth) {
      return null;
    }
    
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (!idToken) {
      throw new Error("No authenticated session available. Please log in again.");
    }
    
    const response = await fetch("/api/admin/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify(userData)
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "User provisioning failed.");
    }
    
    const data = await response.json();
    return data.uid; // Firebase UID
  };

  const toggleUserStatusInBackend = async (userId: string, currentStatus: string) => {
    if (!isFirebaseEnabled || !auth) {
      return null;
    }
    
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
    if (!idToken) {
      throw new Error("No authenticated session available. Please log in again.");
    }
    
    const response = await fetch("/api/admin/users/toggle-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ userId, currentStatus })
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to alter status.");
    }
    
    return await response.json();
  };

  // 1. Create Councillor Account (Super Admin only check inside function)
  const handleCreateCouncillor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentUser.role !== "super_admin") {
      onAddToast("Unauthorized Action", "Only Super Administrators can create and register new Councillor accounts.", "error");
      return;
    }

    if (!newCllrName.trim() || !newCllrIdNumber.trim() || !newCllrEmail.trim() || !newCllrUsername.trim() || !newCllrPassword.trim()) {
      onAddToast("Validation Error", "Please fill in all mandatory fields.", "warning");
      return;
    }

    if (newCllrPassword !== newCllrConfirmPassword) {
      onAddToast("Password Mismatch", "Password and Confirm Password inputs do not match.", "warning");
      return;
    }

    // Find Ward details
    const selectedWardObj = wards.find(w => w.wardNumber === Number(newCllrWard));
    const wardName = selectedWardObj ? selectedWardObj.wardName : `Ward ${newCllrWard}`;

    let nextId = "";

    if (isFirebaseEnabled && auth) {
      try {
        const uid = await createSecureUserInBackend({
          email: newCllrEmail.trim(),
          password: newCllrPassword,
          name: newCllrName.trim(),
          phone: newCllrPhone.trim(),
          physicalAddress: newCllrAddress.trim() || "Thulamela Ward Precinct",
          username: newCllrUsername.trim(),
          role: "councillor",
          employeeNumber: newCllrEmpNumber.trim() || `EMP-CLLR-${newCllrWard}`,
          saIdNumber: newCllrIdNumber.trim(),
          wardNumber: Number(newCllrWard),
          wardName: wardName,
          politicalPosition: newCllrPolitical,
          profilePicture: newCllrProfilePic.trim()
        });
        nextId = uid;
      } catch (err: any) {
        onAddToast("Provisioning Failed", err.message, "error");
        return;
      }
    } else {
      // Local Storage Fallback Duplication Checks
      const isDuplicateUsername = users.some(u => u.username.toLowerCase() === newCllrUsername.toLowerCase().trim());
      if (isDuplicateUsername) {
        onAddToast("Validation Error", `The username "${newCllrUsername}" already exists. Please choose a unique username.`, "error");
        return;
      }

      const isDuplicateEmail = users.some(u => u.email.toLowerCase() === newCllrEmail.toLowerCase().trim());
      if (isDuplicateEmail) {
        onAddToast("Validation Error", `The email address "${newCllrEmail}" is already registered in the CRM.`, "error");
        return;
      }

      const isDuplicateId = users.some(u => u.saIdNumber === newCllrIdNumber.trim());
      if (isDuplicateId) {
        onAddToast("Validation Error", `The South African ID number "${newCllrIdNumber}" is already registered to an existing account.`, "error");
        return;
      }

      nextId = `COUN-${users.length + 101}`;
      
      const newCllr: User = {
        id: nextId,
        name: newCllrName.trim(),
        email: newCllrEmail.trim(),
        phone: newCllrPhone.trim(),
        physicalAddress: newCllrAddress.trim() || "Thulamela Ward Precinct",
        username: newCllrUsername.trim(),
        role: "councillor",
        employeeNumber: newCllrEmpNumber.trim() || `EMP-CLLR-${newCllrWard}`,
        saIdNumber: newCllrIdNumber.trim(),
        wardNumber: Number(newCllrWard),
        wardName: wardName,
        politicalPosition: newCllrPolitical,
        status: "active",
        profilePicture: newCllrProfilePic.trim() || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        dateCreated: new Date().toISOString()
      };

      const updatedUsers = [...users, newCllr];
      saveUsers(updatedUsers);
    }

    // Update Ward allocation details
    const updatedWards = wards.map(w => {
      if (w.wardNumber === Number(newCllrWard)) {
        return {
          ...w,
          assignedCouncillorId: nextId,
          councillorName: newCllrName.trim(),
          contactDetails: newCllrPhone.trim()
        };
      }
      return w;
    });
    saveWards(updatedWards);

    // Audit Log entry
    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Create Councillor",
      `Created Councillor Cllr ${newCllrName} for Ward ${newCllrWard} (${wardName}). Reference ID: ${nextId}.`
    );

    // Toast and clear
    onAddToast(
      "Councillor Registered Successfully",
      `Account for Cllr ${newCllrName} has been fully created and secured in Firebase.`,
      "success"
    );

    setNewCllrName("");
    setNewCllrIdNumber("");
    setNewCllrEmpNumber("");
    setNewCllrEmail("");
    setNewCllrPhone("");
    setNewCllrAddress("");
    setNewCllrUsername("");
    setNewCllrPassword("");
    setNewCllrConfirmPassword("");
    setNewCllrProfilePic("");

    loadDashboardData();
  };

  const handleApproveRequest = async (request: AccountRequest) => {
    const selectedWardObj = wards.find(w => w.wardNumber === request.wardNumber);
    const wardName = selectedWardObj ? selectedWardObj.wardName : `Ward ${request.wardNumber}`;

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);

    let nextId = "";

    if (isFirebaseEnabled && auth) {
      try {
        const uid = await createSecureUserInBackend({
          email: request.email,
          password: tempPassword,
          name: request.name,
          phone: request.phone,
          physicalAddress: "Thulamela Ward Precinct",
          username: request.email.split("@")[0],
          role: "councillor",
          employeeNumber: `EMP-CLLR-${request.wardNumber}`,
          saIdNumber: request.saIdNumber,
          wardNumber: request.wardNumber,
          wardName: wardName,
          politicalPosition: request.politicalPosition,
          profilePicture: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        });
        nextId = uid;
      } catch (err: any) {
        onAddToast("Provisioning Failed", err.message, "error");
        return;
      }
    } else {
      nextId = `COUN-${users.length + 101}`;

      const newCllr: User = {
        id: nextId,
        name: request.name,
        email: request.email,
        phone: request.phone,
        physicalAddress: "Thulamela Ward Precinct",
        username: request.email.split("@")[0],
        role: "councillor",
        employeeNumber: `EMP-CLLR-${request.wardNumber}`,
        saIdNumber: request.saIdNumber,
        wardNumber: request.wardNumber,
        wardName: wardName,
        politicalPosition: request.politicalPosition,
        status: "active",
        profilePicture: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
        dateCreated: new Date().toISOString(),
        tempPassword: tempPassword,
        mustChangePassword: true
      };

      const updatedUsers = [...users, newCllr];
      saveUsers(updatedUsers);
    }

    const updatedWards = wards.map(w => {
      if (w.wardNumber === request.wardNumber) {
        return { ...w, assignedCouncillorId: nextId, councillorName: request.name, contactDetails: request.phone };
      }
      return w;
    });
    saveWards(updatedWards);

    // Update Firestore
    updateDoc(doc(db, "accountRequests", request.id), { status: "approved" });

    // Send notification to the new councillor
    addNotification(nextId, "councillor", "Account Created", "Your councillor account has been approved and created.", "success");

    onAddToast("Account Approved", `Account for ${request.name} created. Temp password: ${tempPassword} (Email/SMS sent).`, "success");
    
    // Refresh requests
    setAccountRequests(prev => prev.filter(r => r.id !== request.id));
    loadDashboardData();
  };

  // Deactivate Councillor account
  const handleToggleUserStatus = async (userId: string, currentStatus: "active" | "inactive") => {
    if (currentUser.role !== "super_admin") {
      onAddToast("Unauthorized Action", "Only Super Administrators can modify account status.", "error");
      return;
    }

    const nextStatus = currentStatus === "active" ? "inactive" : "active";

    if (isFirebaseEnabled && auth) {
      try {
        await toggleUserStatusInBackend(userId, currentStatus);
      } catch (err: any) {
        onAddToast("Modification Failed", err.message, "error");
        return;
      }
    } else {
      const updatedUsers = users.map(u => {
        if (u.id === userId) {
          return { ...u, status: nextStatus };
        }
        return u;
      });
      saveUsers(updatedUsers);
    }

    // If deactivated, we clear them from the Ward details
    if (nextStatus === "inactive") {
      const updatedWards = wards.map(w => {
        if (w.assignedCouncillorId === userId) {
          return {
            ...w,
            assignedCouncillorId: null,
            councillorName: null,
            contactDetails: null
          };
        }
        return w;
      });
      saveWards(updatedWards);
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Toggle User Status",
      `Changed user ${userId} status to ${nextStatus}.`
    );

    onAddToast(
      "Status Modified",
      `User ${userId} status has been toggled to ${nextStatus} successfully.`,
      "success"
    );

    loadDashboardData();
  };

  // Edit Ward details & Councillor transfer
  const handleEditWardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWard) return;

    const targetCouncillor = users.find(u => u.id === wardEditCouncillor);
    
    // Update Ward
    const updatedWards = wards.map(w => {
      if (w.wardNumber === editingWard.wardNumber) {
        return {
          ...w,
          wardName: wardEditName.trim() || w.wardName,
          assignedCouncillorId: targetCouncillor ? targetCouncillor.id : null,
          councillorName: targetCouncillor ? targetCouncillor.name : null,
          contactDetails: targetCouncillor ? targetCouncillor.phone : null
        };
      }
      return w;
    });

    saveWards(updatedWards);

    // Update Councillor Ward link
    if (targetCouncillor) {
      const updatedUsers = users.map(u => {
        if (u.id === targetCouncillor.id) {
          return {
            ...u,
            wardNumber: editingWard.wardNumber,
            wardName: wardEditName.trim() || editingWard.wardName
          };
        }
        // If councillor was in this ward before, let's keep them or transfer
        return u;
      });
      saveUsers(updatedUsers);
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Update Ward Details",
      `Modified Ward ${editingWard.wardNumber} details. Assigned Councillor: ${targetCouncillor ? targetCouncillor.name : "None"}.`
    );

    onAddToast("Ward Information Saved", `Ward ${editingWard.wardNumber} has been updated successfully.`, "success");
    setEditingWard(null);
    loadDashboardData();
  };

  // Complaint Allocation Operations
  const handleDispatchComplaint = (complaintId: string) => {
    const selectedDeptObj = departments.find(d => d.id === dispatchDeptId);
    const selectedTechObj = technicians.find(t => t.id === dispatchTechId);

    const allComplaints = getComplaints();
    const updated = allComplaints.map(c => {
      if (c.id === complaintId) {
        const logs = [...c.logs];
        
        if (dispatchStatus === "Assigned") {
          logs.push({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Technician Assigned",
            userName: currentUser.name,
            userRole: currentUser.role,
            note: `Assigned to ${selectedDeptObj ? selectedDeptObj.name : "Municipal Department"}. Dispatched Field Tech: ${selectedTechObj ? selectedTechObj.name : "Awaiting Name"}.`
          });
        } else if (dispatchStatus === "Resolved") {
          logs.push({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Status Updated to Resolved",
            userName: currentUser.name,
            userRole: currentUser.role,
            note: `Marked as Resolved. Resolution notes: "${resolutionNotes || "Restored successfully"}"`
          });
        } else if (dispatchStatus === "Closed") {
          logs.push({
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "Inquiry Closed",
            userName: currentUser.name,
            userRole: currentUser.role,
            note: "Service inquiry file closed. Satisfactory confirmation acquired."
          });
        }

        return {
          ...c,
          status: dispatchStatus,
          priority: dispatchPriority,
          departmentId: dispatchDeptId || c.departmentId,
          departmentName: selectedDeptObj ? selectedDeptObj.name : c.departmentName,
          assignedTechnicianId: dispatchTechId || c.assignedTechnicianId,
          assignedTechnicianName: selectedTechObj ? selectedTechObj.name : c.assignedTechnicianName,
          resolutionNotes: resolutionNotes || c.resolutionNotes,
          logs: logs,
          dateUpdated: new Date().toISOString()
        };
      }
      return c;
    });

    saveComplaints(updated);
    
    // Dispatch notification to Councillor
    const targetComp = allComplaints.find(c => c.id === complaintId);
    if (targetComp) {
      addNotification(
        targetComp.reporterId,
        "councillor",
        `Complaint ${complaintId} Updated`,
        `Your logged case regarding '${targetComp.title}' is now updated to: ${dispatchStatus}.`,
        dispatchStatus === "Resolved" ? "success" : "info",
        complaintId
      );
    }

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Update Complaint Allocation",
      `Dispatched/updated ticket ${complaintId} as ${dispatchStatus}.`
    );

    onAddToast("Complaint Updated", `Case file ${complaintId} has been updated successfully in the ledger.`, "success");
    setSelectedComplaint(null);
    loadDashboardData();
  };

  // Filter lists
  const filteredCouncillors = users.filter(u => u.role === "councillor").filter(u => {
    return u.name.toLowerCase().includes(councillorSearch.toLowerCase()) ||
           u.id.toLowerCase().includes(councillorSearch.toLowerCase()) ||
           u.username.toLowerCase().includes(councillorSearch.toLowerCase());
  });

  const filteredWards = wards.filter(w => {
    return w.wardName.toLowerCase().includes(wardSearch.toLowerCase()) ||
           w.wardNumber.toString() === wardSearch;
  });

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.id.toLowerCase().includes(complaintSearch.toLowerCase()) ||
                          c.title.toLowerCase().includes(complaintSearch.toLowerCase()) ||
                          c.reporterName.toLowerCase().includes(complaintSearch.toLowerCase());
    const matchesStatus = complaintStatusFilter === "All" || c.status === complaintStatusFilter;
    const matchesWard = complaintWardFilter === "All" || c.wardNumber.toString() === complaintWardFilter;
    
    return matchesSearch && matchesStatus && matchesWard;
  });

  const handleDownloadComplaintsReport = () => {
    const headers = [
      "Reference Number",
      "Title",
      "Category",
      "Ward",
      "Status",
      "Priority",
      "Date Reported",
      "Assigned Technician"
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredComplaints.map(comp => [
      escapeCsv(comp.id),
      escapeCsv(comp.title),
      escapeCsv(comp.category),
      escapeCsv(`Ward ${comp.wardNumber}${comp.wardName ? ` (${comp.wardName})` : ''}`),
      escapeCsv(comp.status),
      escapeCsv(comp.priority),
      escapeCsv(comp.dateCreated ? new Date(comp.dateCreated).toLocaleDateString() : ''),
      escapeCsv(comp.assignedTechnicianName || "Awaiting Dispatch")
    ]);

    const csvContent = [headers.map(h => `"${h}"`).join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `complaints_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onAddToast("Report Exported", `Downloaded ${filteredComplaints.length} complaint record(s) as CSV.`, "success");
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case "Submitted": return "bg-amber-100 text-amber-800 border border-amber-200";
      case "Assigned": return "bg-blue-100 text-blue-800 border border-blue-200";
      case "Resolved": return "bg-emerald-100 text-emerald-800 border border-emerald-200";
      case "Closed": return "bg-slate-100 text-slate-800 border border-slate-200";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  const getPriorityBadge = (priority: ComplaintPriority) => {
    switch (priority) {
      case "Low": return "bg-slate-100 text-slate-600";
      case "Medium": return "bg-blue-100 text-blue-700";
      case "High": return "bg-orange-100 text-orange-800 font-bold";
      case "Critical": return "bg-red-100 text-red-800 font-bold border border-red-200 animate-pulse";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div id="admin-dashboard-container" className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 border-r border-slate-800 flex flex-col justify-between">
        <div className="p-5 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-5">
            <div className="w-10 h-10 rounded-full border border-gov-yellow bg-slate-800 flex items-center justify-center overflow-hidden font-mono font-black text-gov-yellow">
              ADM
            </div>
            <div>
              <h4 className="font-black text-xs text-slate-100 uppercase tracking-wider block">{currentUser.name.split(" ").slice(-1)[0]}</h4>
              <span className="text-[10px] text-gov-yellow font-mono tracking-widest block font-bold uppercase">
                {currentUser.role.replace("_", " ")}
              </span>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs">
            <button
              id="admin-tab-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "dashboard" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </button>

            <button
              id="admin-tab-councillors"
              onClick={() => setActiveTab("councillors")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "councillors" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Users size={16} />
              <span>Manage Councillors</span>
            </button>

            <button
              id="admin-tab-wards"
              onClick={() => setActiveTab("wards")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "wards" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Layers size={16} />
              <span>Manage Wards (41)</span>
            </button>

            <button
              id="admin-tab-complaints"
              onClick={() => setActiveTab("complaints")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "complaints" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <ListTodo size={16} />
              <span>Manage Complaints</span>
              {complaintsPending > 0 && (
                <span className="ml-auto bg-gov-yellow text-slate-900 font-bold px-1.5 py-0.5 rounded-full text-[9px]">
                  {complaintsPending}
                </span>
              )}
            </button>

            <button
              id="admin-tab-technicians"
              onClick={() => setActiveTab("technicians")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "technicians" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Wrench size={16} />
              <span>Technicians</span>
            </button>

            <button
              id="admin-tab-logs"
              onClick={() => setActiveTab("logs")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "logs" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <FileText size={16} />
              <span>Audit Logs</span>
            </button>

            <div className="border-t border-slate-800 my-2 pt-2">
              <span className="px-4 text-[9px] font-black uppercase text-slate-500 tracking-wider block mb-1">Advanced Modules</span>
            </div>

            <button
              id="admin-tab-chat"
              onClick={() => setActiveTab("chat")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "chat" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <MessageSquare size={16} />
              <span>Internal Chat</span>
            </button>

            <button
              id="admin-tab-calendar"
              onClick={() => setActiveTab("calendar")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "calendar" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Calendar size={16} />
              <span>Scheduler</span>
            </button>

            <button
              id="admin-tab-tasks"
              onClick={() => setActiveTab("tasks")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "tasks" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <CheckSquare size={16} />
              <span>Task Dispatch</span>
            </button>

            <button
              id="admin-tab-gis"
              onClick={() => setActiveTab("gis")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "gis" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Map size={16} />
              <span>Interactive GIS</span>
            </button>

            <button
              id="admin-tab-kpis"
              onClick={() => setActiveTab("executive_dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "executive_dashboard" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <BarChart2 size={16} />
              <span>Executive KPIs</span>
            </button>

            <button
              id="admin-tab-documents"
              onClick={() => setActiveTab("documents")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "documents" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Folder size={16} />
              <span>Repository</span>
            </button>

            <button
              id="admin-tab-account-requests"
              onClick={() => setActiveTab("account_requests")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "account_requests" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <UserPlus size={16} />
              <span>Account Requests</span>
            </button>

            <button
              id="admin-tab-digital-forms"
              onClick={() => setActiveTab("digital_forms")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "digital_forms" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <Clipboard size={16} />
              <span>Digital Forms</span>
            </button>

            <button
              id="admin-tab-service-notices"
              onClick={() => setActiveTab("service_notices")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-bold uppercase tracking-wider transition-all ${
                activeTab === "service_notices" ? "bg-gov-blue text-white shadow-md shadow-gov-blue/20" : "hover:bg-slate-800 hover:text-white text-slate-400"
              }`}
            >
              <AlertTriangle size={16} />
              <span>Service Notices</span>
            </button>
          </nav>
        </div>

        <div className="p-5 border-t border-slate-800 bg-slate-950/40">
          <button
            id="admin-logout-btn"
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
            <span className="text-[10px] font-mono tracking-wider bg-gov-yellow text-slate-900 px-2 py-1 rounded font-bold uppercase">
              Thulamela CRM Headquarters
            </span>
            <h1 className="text-2xl font-black text-slate-900 uppercase mt-1">
              Executive Dashboard
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Administrator: <strong>{currentUser.name}</strong> • Role Auth: {currentUser.role.replace("_", " ")}
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
              <span className="font-bold font-mono text-slate-700">{new Date().toLocaleDateString("en-ZA", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* TAB 1: EXECUTIVE ANALYTICS COCKPIT */}
        {activeTab === "dashboard" && (
          <div id="admin-pane-dashboard" className="space-y-6">
            
            {/* 5 Cards Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div 
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => setActiveTab("wards")}
              >
                <div className="text-gov-green flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-green block">Active Wards</span>
                  <Layers size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">41</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Click for Ward Dashboard</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-slate-400 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Complaints</span>
                  <Layers size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{totalComplaints}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Active Municipal Log</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-amber-500 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Awaiting Dispatch</span>
                  <AlertTriangle size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{complaintsPending}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Pending Action</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-gov-blue flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-blue block">Dispatched</span>
                  <Clock size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{complaintsAssigned}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Field Technicians Engaged</span>
              </div>

              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                <div className="text-emerald-500 flex justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Resolved</span>
                  <CheckCircle size={16} />
                </div>
                <span className="text-2xl font-black text-slate-800 font-mono">{complaintsResolved + complaintsClosed}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Complaints Resolved</span>
              </div>
            </div>

            {/* GEMINI AI STRATEGIC EXECUTIVE DESK */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h3 className="font-black text-slate-100 uppercase text-xs tracking-wider font-sans">
                      Gemini Strategic Administrative Desk
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold font-mono">Real-time LLM-driven infrastructure analysis & bottleneck detection.</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isInsightsLoading}
                  onClick={fetchStrategicInsights}
                  className="px-4 py-2 bg-gov-yellow hover:bg-gov-yellow/90 text-slate-900 font-black text-[9px] uppercase tracking-wider rounded-lg shadow-md transition-all disabled:opacity-50"
                >
                  {isInsightsLoading ? "Analyzing Ward Data..." : "Load Strategic Insights"}
                </button>
              </div>

              {insightsData ? (
                <div className="space-y-4 animate-fadeIn text-xs font-semibold">
                  {/* Headline & Alert Banner */}
                  <div className="bg-slate-800/80 border-l-4 border-gov-yellow p-4 rounded-r-xl space-y-1">
                    <span className="text-[9px] uppercase font-mono text-gov-yellow font-bold tracking-widest block">Executive Warning Alert</span>
                    <h4 className="font-black text-slate-100 uppercase text-xs leading-snug">
                      {insightsData.headline}
                    </h4>
                    <p className="text-slate-300 font-medium leading-relaxed mt-1">
                      {insightsData.criticalAlert}
                    </p>
                  </div>

                  {/* 3 Core Action Items/Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {insightsData.recommendations && insightsData.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl flex items-start space-x-3">
                        <span className="text-gov-yellow font-mono font-black text-xs">0{index + 1}.</span>
                        <div>
                          <span className="text-[9px] uppercase font-mono text-slate-500 block mb-1">Strategic Measure</span>
                          <p className="text-slate-200 leading-normal">{rec}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strategic Outlook */}
                  <div className="border-t border-slate-800 pt-4 text-slate-400 italic text-[11px] leading-relaxed flex items-center justify-between">
                    <span>"{insightsData.strategicOutlook}"</span>
                    <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold ml-4 whitespace-nowrap">
                      Optimized Delivery Policy
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                  <p className="text-slate-400 font-bold text-xs">No strategic insights generated for this shift yet.</p>
                  <p className="text-[10px] text-slate-500 max-w-md">Click "Load Strategic Insights" to parse active cases across all 41 Wards and detect operational bottlenecks instantly.</p>
                </div>
              )}
            </div>

            {/* Custom Interactive SVG Chart Layout */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider flex items-center">
                    <TrendingUp className="mr-1.5 text-gov-blue" size={16} />
                    <span>Resolution Index & Ward Complaint Trends</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Statistical index representing infrastructure categories logged inside Vhembe District.</p>
                </div>
                <span className="text-[9px] font-mono uppercase bg-gov-blue/5 text-gov-blue px-2 py-0.5 rounded font-bold">
                  FY 2026/2027
                </span>
              </div>

              {/* Handcrafted clean responsive SVG Bar Graph */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* SVG Visual Graph Container */}
                <div className="lg:col-span-8 space-y-2">
                  <div className="h-60 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Case Categories Volume</span>
                    
                    {/* SVG bars */}
                    <div className="flex items-end justify-around h-40 pt-4 px-2">
                      {[
                        { label: "Water", value: 18, color: "bg-gov-blue" },
                        { label: "Elect", value: 12, color: "bg-gov-yellow" },
                        { label: "Roads", value: 24, color: "bg-gov-green" },
                        { label: "Waste", value: 15, color: "bg-orange-500" },
                        { label: "Sewer", value: 9, color: "bg-purple-600" },
                        { label: "Lights", value: 16, color: "bg-amber-400" }
                      ].map((bar, idx) => {
                        const pct = (bar.value / 24) * 100;
                        return (
                          <div key={idx} className="flex flex-col items-center space-y-2 flex-grow max-w-16">
                            <span className="text-[10px] font-bold text-slate-700 font-mono">{bar.value}</span>
                            <div className="w-8 bg-slate-200 rounded-t h-28 flex items-end">
                              <div 
                                className={`${bar.color} w-full rounded-t transition-all duration-1000`}
                                style={{ height: `${pct}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{bar.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Performance indicators list */}
                <div className="lg:col-span-4 space-y-4">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Key Performance Indicators</h4>
                  
                  <div className="space-y-3 text-xs">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Complaints Completion Ratio</span>
                        <span className="font-black font-mono text-gov-green">
                          {totalComplaints > 0 ? Math.round(((complaintsResolved + complaintsClosed) / totalComplaints) * 100) : 0}%
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">Active Ward Councillors linked</span>
                        <span className="font-black font-mono text-gov-blue">
                          {totalCouncillorsCount} Wards
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-bold">System Health & Security</span>
                        <span className="font-black font-mono text-emerald-600 uppercase flex items-center">
                          <ShieldCheck size={12} className="mr-1" /> ONLINE
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 2: MANAGE WARD COUNCILLORS (Super Admin only can Register) */}
        {activeTab === "councillors" && (
          <div id="admin-pane-councillors" className="space-y-6">
            
            {/* Create Councillor Account Box */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
                  <UserPlus className="mr-2 text-gov-blue" size={22} />
                  <span>Register & Create Councillor Account</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">Super Administrators only. Submit details to register ward representation across Thulamela's 41 local wards.</p>
              </div>

              {currentUser.role !== "super_admin" ? (
                <div className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl flex items-center space-x-2 text-xs">
                  <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
                  <span>Your current credentials ({currentUser.role}) do not permit registering new ward staff. Please contact the primary Super Administrator.</span>
                </div>
              ) : (
                <form onSubmit={handleCreateCouncillor} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Full Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Cllr Rendani Mulaudzi"
                        value={newCllrName}
                        onChange={(e) => setNewCllrName(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-semibold text-slate-950 text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">South African ID Number *</label>
                      <input
                        type="text"
                        required
                        maxLength={13}
                        placeholder="e.g. 8504125896084"
                        value={newCllrIdNumber}
                        onChange={(e) => setNewCllrIdNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-semibold font-mono text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Employee Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. EMP-CLLR-041"
                        value={newCllrEmpNumber}
                        onChange={(e) => setNewCllrEmpNumber(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-semibold font-mono text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. r.mulaudzi@thulamela.gov.za"
                        value={newCllrEmail}
                        onChange={(e) => setNewCllrEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-semibold font-mono text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 082 555 1234"
                        value={newCllrPhone}
                        onChange={(e) => setNewCllrPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-semibold font-mono text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Assigned Ward (1-41) *</label>
                      <select
                        value={newCllrWard}
                        onChange={(e) => setNewCllrWard(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-bold text-base"
                      >
                        {wards.map(w => (
                          <option key={w.wardNumber} value={w.wardNumber}>
                            Ward {w.wardNumber} ({w.wardName}) {w.assignedCouncillorId ? "• Occupied" : "• VACANT"}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Political Position / Party *</label>
                      <select
                        value={newCllrPolitical}
                        onChange={(e) => setNewCllrPolitical(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-bold text-base"
                      >
                        <option value="ANC Ward Councillor">African National Congress (ANC) Ward Councillor</option>
                        <option value="EFF Ward Representative">Economic Freedom Fighters (EFF) Ward Representative</option>
                        <option value="DA Ward Representative">Democratic Alliance (DA) Ward Representative</option>
                        <option value="Independent Ward Councillor">Independent Ward Councillor</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Profile Picture URL (Optional)</label>
                      <input
                        type="url"
                        placeholder="e.g. https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150"
                        value={newCllrProfilePic}
                        onChange={(e) => setNewCllrProfilePic(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-semibold text-slate-800 text-base"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Username *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. cllr41"
                        value={newCllrUsername}
                        onChange={(e) => setNewCllrUsername(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-bold font-mono text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newCllrPassword}
                        onChange={(e) => setNewCllrPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-mono font-bold text-base"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Confirm Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newCllrConfirmPassword}
                        onChange={(e) => setNewCllrConfirmPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-blue font-mono font-bold text-base"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      id="submit-new-councillor-btn"
                      type="submit"
                      className="px-6 py-3 bg-gov-blue hover:bg-gov-blue-hover text-white font-bold rounded-lg uppercase tracking-wider shadow-sm transition-all"
                    >
                      Create Cllr Account
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* List Councillors Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Registered Ward Councillors</h3>
                <div className="relative w-72 text-xs">
                  <input
                    type="text"
                    placeholder="Search by name, ID or username..."
                    value={councillorSearch}
                    onChange={(e) => setCouncillorSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-8 pr-4 text-base"
                  />
                  <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                      <th className="p-4">Councillor Name</th>
                      <th className="p-4 font-mono">LDAP Username</th>
                      <th className="p-4">Ward Location</th>
                      <th className="p-4 font-mono">Employee No</th>
                      <th className="p-4">Contact Detail</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredCouncillors.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img src={c.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                            <div>
                              <span className="font-bold text-slate-900 block">{c.name}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{c.saIdNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-gov-blue">{c.username}</td>
                        <td className="p-4">
                          <span className="font-bold block">Ward {c.wardNumber}</span>
                          <span className="text-[10px] text-slate-400 block">{c.wardName}</span>
                        </td>
                        <td className="p-4 font-mono">{c.employeeNumber}</td>
                        <td className="p-4">
                          <span className="block font-bold">{c.phone}</span>
                          <span className="text-[10px] text-slate-400 font-mono block">{c.email}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            c.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            id={`toggle-status-${c.id}`}
                            onClick={() => handleToggleUserStatus(c.id, c.status)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${
                              c.status === "active" 
                                ? "bg-red-50 hover:bg-red-100 text-red-600 border border-red-100" 
                                : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100"
                            }`}
                          >
                            {c.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: WARD MANAGEMENT MODULE (41 wards details) */}
        {activeTab === "wards" && (
          <WardManagement 
            wards={wards} 
            users={users} 
            complaints={complaints} 
            calculateWardComplaints={calculateWardComplaints} 
          />
        )}

        {/* TAB 4: COMPLAINTS REGISTER / DISPATCH ROOM */}
        {activeTab === "complaints" && (
          <div id="admin-pane-complaints" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Dispatch Operations & Case Files</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Evaluate, allocate departments, assign field technicians and resolve logged service delivery queries.</p>
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {/* Ward selector */}
                <select 
                  value={complaintWardFilter} 
                  onChange={(e) => setComplaintWardFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-base"
                >
                  <option value="All">All Wards</option>
                  {wards.map(w => (
                    <option key={w.wardNumber} value={w.wardNumber}>Ward {w.wardNumber}</option>
                  ))}
                </select>

                {/* Status selector */}
                <select 
                  value={complaintStatusFilter} 
                  onChange={(e) => setComplaintStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-base"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>

                <button
                  id="btn-download-complaints-report"
                  type="button"
                  onClick={handleDownloadComplaintsReport}
                  className="px-3.5 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Download size={14} />
                  <span>Download Report</span>
                </button>
              </div>
            </div>

            <div className="relative text-xs">
              <input
                type="text"
                placeholder="Search complaints by title, Cllr name or COMP reference..."
                value={complaintSearch}
                onChange={(e) => setComplaintSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 font-semibold text-base"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <th className="p-4 font-mono">Reference</th>
                    <th className="p-4">Geographical Location</th>
                    <th className="p-4">Inquiry Subject</th>
                    <th className="p-4">Reported By</th>
                    <th className="p-4">Severity</th>
                    <th className="p-4">Dispatched Technician</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Operation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-10 text-slate-400 font-bold">
                        No municipal cases matching filters inside database.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map(comp => (
                      <tr key={comp.id} className="hover:bg-slate-50/40">
                        <td className="p-4 font-mono font-black text-gov-blue">{comp.id}</td>
                        <td className="p-4">
                          <span className="font-bold block text-slate-900">Ward {comp.wardNumber}</span>
                          <span className="text-[10px] text-slate-400 block">{comp.wardName}</span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold block text-slate-900 max-w-xs truncate">{comp.title}</span>
                          <span className="text-[10px] text-slate-400 block">{comp.category}</span>
                        </td>
                        <td className="p-4">
                          <span className="block font-bold">{comp.reporterName}</span>
                          <span className="text-[9px] text-slate-400 font-mono block">Cllr ID: {comp.reporterId}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${getPriorityBadge(comp.priority)}`}>
                            {comp.priority}
                          </span>
                        </td>
                        <td className="p-4">
                          {comp.assignedTechnicianName ? (
                            <div>
                              <span className="font-bold block text-slate-800">{comp.assignedTechnicianName}</span>
                              <span className="text-[9px] text-slate-400 font-mono block">{comp.departmentName}</span>
                            </div>
                          ) : (
                            <span className="text-red-500 font-black text-[9px] uppercase tracking-wide">Awaiting Dispatch</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(comp.status)}`}>
                            {comp.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            id={`dispatch-comp-btn-${comp.id}`}
                            onClick={() => {
                              setSelectedComplaint(comp);
                              setDispatchDeptId(comp.departmentId || "");
                              setDispatchTechId(comp.assignedTechnicianId || "");
                              setDispatchPriority(comp.priority);
                              setDispatchStatus(comp.status);
                              setResolutionNotes(comp.resolutionNotes || "");
                            }}
                            className="px-3 py-1.5 bg-gov-blue hover:bg-gov-blue-hover text-white text-[10px] font-bold uppercase rounded transition-all shadow-sm"
                          >
                            Dispatch Desk
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

        {/* TAB 5: TECHNICIANS DIRECTORY */}
        {activeTab === "technicians" && (
          <div id="admin-pane-technicians" className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">Active Field Technicians Directory</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Review dispatch workload and active tickets per municipal engineering department.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
                {technicians.map(tech => (
                  <div key={tech.id} className="border border-slate-100 bg-slate-50 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono font-bold bg-gov-blue/10 text-gov-blue px-2 py-0.5 rounded uppercase">
                            {tech.id}
                          </span>
                          <h4 className="font-black text-slate-950 text-base mt-1">{tech.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono block">{tech.departmentName}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          tech.status === "available" ? "bg-emerald-100 text-emerald-800"
                            : tech.status === "busy" ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {tech.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="border-t border-slate-200/60 pt-3 grid grid-cols-2 gap-4 text-center font-mono">
                        <div className="bg-white border border-slate-200/50 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Active Jobs</span>
                          <p className="text-base font-black text-slate-800 mt-0.5">{tech.activeTasks}</p>
                        </div>
                        <div className="bg-white border border-slate-200/50 p-2 rounded-lg">
                          <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">Closed Jobs</span>
                          <p className="text-base font-black text-slate-800 mt-0.5">{tech.completedTasks}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/60 pt-3 text-[10px] text-slate-500 space-y-1">
                      <span className="block font-bold">Direct Mobile: <span className="font-mono text-slate-800">{tech.phone}</span></span>
                      <span className="block font-bold">LDAP Email: <span className="font-mono text-slate-800">{tech.email}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === "logs" && (
          <div id="admin-pane-logs" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider">System Audit Ledger</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Immutable trace record of all administrative registrations, state alterations, and authentication events.</p>
              </div>
              <button
                id="btn-print-audit-log"
                onClick={() => onAddToast("Printing Audit Log", "Generating administrative paper report guidelines. Triggering printer protocol...", "success")}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center space-x-1"
              >
                <Printer size={14} />
                <span>Print Log</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto text-xs">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="bg-slate-700 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded">
                        {log.id}
                      </span>
                      <span className="font-black text-slate-900">{log.action}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{log.details}</p>
                    <span className="text-[9px] text-slate-400 uppercase font-mono block">Operator: {log.userName} ({log.userRole})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                    {new Date(log.timestamp).toLocaleString("en-ZA")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <InternalChat currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "calendar" && (
          <MunicipalCalendar currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "tasks" && (
          <TaskManager currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "gis" && (
          <InteractiveGIS currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "executive_dashboard" && (
          <ExecutiveDashboardView currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "documents" && (
          <DocumentManager currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "account_requests" && (
          <div id="admin-pane-account-requests" className="space-y-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-xl font-black text-slate-900 uppercase">Account Requests</h2>
            {accountRequests.length === 0 ? (
              <p className="text-xs text-slate-500">No pending account requests.</p>
            ) : (
              <div className="space-y-3">
                {accountRequests.map(req => (
                  <div key={req.id} className="border border-slate-100 p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold">{req.name}</p>
                      <p className="text-slate-500">{req.email} | Ward {req.wardNumber}</p>
                    </div>
                    <button 
                      onClick={() => handleApproveRequest(req)}
                      className="bg-gov-green hover:bg-gov-green-hover text-white px-4 py-2 rounded-lg font-bold uppercase tracking-wider"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "digital_forms" && (
          <DigitalForms currentUser={currentUser} onAddToast={onAddToast} />
        )}

        {activeTab === "service_notices" && (
          <ServiceNoticeManagement />
        )}

      </main>

      {/* DISPATCH DESK / COMPLAINT DISPATCH MODAL */}
      {selectedComplaint && (
        <div 
          id="admin-dispatch-modal" 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 border-b-4 border-gov-yellow flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-gov-yellow bg-slate-800 px-2 py-1 rounded">
                  {selectedComplaint.id}
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight truncate max-w-md">{selectedComplaint.title}</h3>
                  <span className="text-[10px] text-slate-400 block font-mono">Reporter: {selectedComplaint.reporterName} • Ward {selectedComplaint.wardNumber}</span>
                </div>
              </div>
              <button 
                id="close-dispatch-modal"
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-grow text-xs">
              
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed text-slate-700">
                <span className="font-bold text-slate-900 block">Logged Complaint:</span>
                {selectedComplaint.description}
              </div>

              {/* Department Allocation */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Allocate Department Division</label>
                <select
                  value={dispatchDeptId}
                  onChange={(e) => {
                    setDispatchDeptId(e.target.value);
                    // clear technician selection as department changed
                    setDispatchTechId("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
                >
                  <option value="">Awaiting Allocation</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {/* Technician Dispatch */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Dispatch Field Technician</label>
                <select
                  value={dispatchTechId}
                  onChange={(e) => setDispatchTechId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
                >
                  <option value="">Awaiting Dispatch</option>
                  {technicians
                    .filter(t => !dispatchDeptId || t.departmentId === dispatchDeptId)
                    .map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} ({tech.status}) • Active: {tech.activeTasks}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentUser.role !== "councillor" && (
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700 block">Severity Level</label>
                    <select
                      value={dispatchPriority}
                      onChange={(e) => setDispatchPriority(e.target.value as ComplaintPriority)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 text-base"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                )}

                {/* Status Selector */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Case File State</label>
                  <select
                    value={dispatchStatus}
                    onChange={(e) => setDispatchStatus(e.target.value as ComplaintStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 text-base"
                  >
                    <option value="Pending">Pending (Awaiting Allocation)</option>
                    <option value="Assigned">Assigned (Dispatched to Tech)</option>
                    <option value="Resolved">Resolved (Service Restored)</option>
                    <option value="Closed">Closed (Archived File)</option>
                  </select>
                </div>
              </div>

              {/* Resolution Notes (visible or editable if set to Resolved) */}
              {(dispatchStatus === "Resolved" || dispatchStatus === "Closed") && (
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Technical Resolution Notes *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide detailed description of repair executed, valve sizes, Eskom transformer specs, etc."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium leading-relaxed text-base"
                  ></textarea>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-2">
              <button
                id="close-dispatch-btn"
                onClick={() => setSelectedComplaint(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase rounded-lg"
              >
                Close
              </button>
              <button
                id="save-dispatch-btn"
                onClick={() => handleDispatchComplaint(selectedComplaint.id)}
                className="px-5 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white font-bold uppercase rounded-lg"
              >
                Save Dispatch Action
              </button>
            </div>

          </div>
        </div>
      )}

      {/* EDIT WARD MODAL */}
      {editingWard && (
        <div 
          id="ward-edit-modal" 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-2xl overflow-hidden animate-fadeIn">
            
            <div className="bg-slate-900 text-white p-5 border-b-4 border-gov-yellow flex justify-between items-center">
              <h3 className="font-black uppercase tracking-tight text-sm">Edit Ward {editingWard.wardNumber} Particulars</h3>
              <button 
                id="close-ward-modal"
                onClick={() => setEditingWard(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditWardSubmit} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Ward Name / Community Village Landmark</label>
                <input
                  type="text"
                  required
                  value={wardEditName}
                  onChange={(e) => setWardEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Assign Ward Representative Councillor</label>
                <select
                  value={wardEditCouncillor}
                  onChange={(e) => setWardEditCouncillor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold text-base"
                >
                  <option value="">Vacant Seat</option>
                  {users.filter(u => u.role === "councillor" && u.status === "active").map(cllr => (
                    <option key={cllr.id} value={cllr.id}>
                      {cllr.name} ({cllr.politicalPosition})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 leading-normal mt-1">
                  Assigning a representative updates their physical jurisdiction dashboard, directing logged complaints to their account ledger.
                </p>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  id="cancel-ward-edit-btn"
                  onClick={() => setEditingWard(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold uppercase rounded-lg"
                >
                  Cancel
                </button>
                <button
                  id="save-ward-edit-btn"
                  type="submit"
                  className="px-5 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white font-bold uppercase rounded-lg"
                >
                  Save Ward Seat
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
