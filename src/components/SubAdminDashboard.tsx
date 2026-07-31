import React, { useState, useEffect } from "react";
import { 
  getComplaints, 
  saveComplaints, 
  getTechnicians, 
  saveTechnicians, 
  addAuditLog, 
  addNotification,
  getNotifications,
  deleteNotification,
  getDepartments,
  getSyncStatus
} from "../db";
import { User, Complaint, Technician, ComplaintStatus, ComplaintPriority, Notification, Department, UserRole } from "../types";
import InternalChat from "./InternalChat";
import MunicipalCalendar from "./MunicipalCalendar";
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  ShieldCheck, 
  LogOut, 
  Search, 
  Filter, 
  Building2, 
  MessageSquare, 
  Bell, 
  User as UserIcon, 
  Settings as SettingsIcon,
  Check,
  X,
  Plus,
  TrendingUp,
  MapPin,
  Phone,
  Mail
} from "lucide-react";

interface SubAdminDashboardProps {
  currentUser: User;
  onLogout: () => void;
  onNavigate: (view: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type SubAdminTab = "overview" | "complaints" | "technicians" | "scheduler" | "sla" | "chat" | "notifications" | "profile" | "settings";

export default function SubAdminDashboard({
  currentUser,
  onLogout,
  onNavigate,
  onAddToast
}: SubAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<SubAdminTab>("overview");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [syncState, setSyncState] = useState<string>("offline");

  // Operational filters
  const [complaintSearch, setComplaintSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Dispatch / Assignment state
  const [assignTechId, setAssignTechId] = useState("");
  const [updateStatusVal, setUpdateStatusVal] = useState<ComplaintStatus>("Assigned");
  const [subAdminNotes, setSubAdminNotes] = useState("");

  const departmentId = currentUser.departmentId;
  const currentDept = departments.find(d => d.id === departmentId);

  const loadData = () => {
    const allComps = getComplaints();
    const allTechs = getTechnicians();
    const allDepts = getDepartments();
    const allNotifs = getNotifications();

    setDepartments(allDepts);
    // Filter complaints strictly by department
    setComplaints(allComps.filter(c => c.departmentId === departmentId));
    // Filter technicians strictly by department
    setTechnicians(allTechs.filter(t => t.departmentId === departmentId));

    const myNotifs = allNotifs.filter(n => {
      if (n.userId === currentUser.id || n.userId === "all") return true;
      if (n.role === "sub_admin") return true;
      return false;
    });
    setNotifications(myNotifs);
    setSyncState(getSyncStatus());
  };

  useEffect(() => {
    loadData();
    const handleDbUpdate = () => loadData();
    window.addEventListener("thulamela_db_update", handleDbUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleDbUpdate);
  }, [currentUser]);

  // Handle Complaint Status / Technician Assignment
  const handleUpdateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    const allComps = getComplaints();
    const targetComp = allComps.find(c => c.id === selectedComplaint.id);
    if (!targetComp) return;

    const assignedTech = technicians.find(t => t.id === assignTechId);

    const updatedLogs = [
      ...(targetComp.logs || []),
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: "Sub-Admin Operational Update",
        userName: currentUser.name,
        userRole: "sub_admin" as UserRole,
        note: `Status changed to ${updateStatusVal}${assignedTech ? `. Assigned to technician ${assignedTech.name}` : ""}. ${subAdminNotes}`
      }
    ];

    const updatedComp: Complaint = {
      ...targetComp,
      status: updateStatusVal,
      assignedTechnicianId: assignTechId || targetComp.assignedTechnicianId,
      assignedTechnicianName: assignedTech ? assignedTech.name : targetComp.assignedTechnicianName,
      logs: updatedLogs,
      dateUpdated: new Date().toISOString()
    };

    const newAllComps = allComps.map(c => c.id === updatedComp.id ? updatedComp : c);
    saveComplaints(newAllComps);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      "sub_admin",
      "Update Department Complaint",
      `Updated complaint #${targetComp.id} status to ${updateStatusVal}`
    );

    onAddToast("Complaint Updated", `Successfully updated docket #${targetComp.id}`, "success");
    setSelectedComplaint(null);
    setSubAdminNotes("");
    loadData();
  };

  // Metrics calculation
  const totalDeptComps = complaints.length;
  const newComps = complaints.filter(c => c.status === "New" || c.status === "Pending").length;
  const assignedComps = complaints.filter(c => c.status === "Assigned").length;
  const inProgressComps = complaints.filter(c => c.status === "In Progress" || c.status === "Waiting for Parts").length;
  const resolvedComps = complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length;
  const slaCompliance = totalDeptComps > 0 ? Math.round(((totalDeptComps - complaints.filter(c => c.status === "Pending" && Date.now() - new Date(c.dateReported).getTime() > 72 * 3600 * 1000).length) / totalDeptComps) * 100) : 100;

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(complaintSearch.toLowerCase()) || c.id.toLowerCase().includes(complaintSearch.toLowerCase()) || (c.wardName || "").toLowerCase().includes(complaintSearch.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="sub-admin-dashboard-container" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight">Thulamela CRM</h1>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium border border-blue-500/30">
                  Sub-Admin Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Department: <span className="text-slate-200 font-semibold">{currentDept?.name || currentUser.departmentName || "Assigned Department"}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300">
              <span className={`w-2 h-2 rounded-full ${syncState === "online" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`}></span>
              <span>{syncState === "online" ? "Cloud Sync Active" : "Local Mode"}</span>
            </div>

            <div className="flex items-center space-x-2 pl-4 border-l border-slate-800">
              <img 
                src={currentUser.profilePicture || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"} 
                alt={currentUser.name} 
                className="w-9 h-9 rounded-full object-cover border-2 border-slate-700" 
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-slate-200">{currentUser.name}</p>
                <p className="text-[10px] text-slate-400">Sub-Admin Manager</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-lg bg-slate-800 hover:bg-red-950/50 hover:text-red-400 text-slate-300 transition-colors flex items-center space-x-1 text-xs font-medium"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <nav className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-20 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 py-2">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "complaints", label: `Complaints (${complaints.length})`, icon: FileText },
            { id: "technicians", label: `Technicians (${technicians.length})`, icon: Wrench },
            { id: "scheduler", label: "Department Scheduler", icon: Calendar },
            { id: "sla", label: "SLA Monitoring", icon: Clock },
            { id: "chat", label: "Internal Chat", icon: MessageSquare },
            { id: "notifications", label: `Notifications (${notifications.length})`, icon: Bell },
            { id: "profile", label: "My Profile", icon: UserIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sub-admin-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id as SubAdminTab)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive 
                    ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Department Greeting Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="relative z-10">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  Operational Command Center
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold mt-2">Welcome back, {currentUser.name}</h2>
                <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                  You are managing the <span className="text-white font-semibold">{currentDept?.name || "Municipal Department"}</span> department. Supervise field staff, dispatch complaints, and monitor SLA response times.
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Department Dockets</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalDeptComps}</p>
                  <span className="text-xs text-blue-600 font-medium mt-1 inline-block">Assigned to {currentDept?.code || "Dept"}</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & In Progress</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{assignedComps + inProgressComps}</p>
                  <span className="text-xs text-amber-600 font-medium mt-1 inline-block">{newComps} pending review</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolved Dockets</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{resolvedComps}</p>
                  <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">Successfully closed</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Technicians</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{technicians.length}</p>
                  <span className="text-xs text-indigo-600 font-medium mt-1 inline-block">{technicians.filter(t => t.status === "available").length} available</span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Quick Actions / Recent Department Dockets */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Recent Department Dockets</h3>
                  <p className="text-xs text-slate-500">Latest complaints logged for {currentDept?.name}</p>
                </div>
                <button
                  onClick={() => setActiveTab("complaints")}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  View All ({complaints.length}) →
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {complaints.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No complaints currently assigned to this department.
                  </div>
                ) : (
                  complaints.slice(0, 5).map(c => (
                    <div key={c.id} className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-blue-600">#{c.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            c.priority === "Critical" || c.priority === "Emergency" ? "bg-red-100 text-red-700" :
                            c.priority === "High" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {c.priority}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            c.status === "Resolved" || c.status === "Closed" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}>
                            {c.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900">{c.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1">{c.description}</p>
                      </div>

                      <button
                        onClick={() => setSelectedComplaint(c)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "complaints" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Department Complaints Management</h2>
                <p className="text-xs text-slate-500">Supervise, dispatch, and update municipal service dockets for {currentDept?.name}</p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search dockets..."
                    value={complaintSearch}
                    onChange={(e) => setComplaintSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for Parts">Waiting for Parts</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Docket ID</th>
                      <th className="py-3 px-4">Complaint Title</th>
                      <th className="py-3 px-4">Ward / Location</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assigned Technician</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredComplaints.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          No matching department complaints found.
                        </td>
                      </tr>
                    ) : (
                      filteredComplaints.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-blue-600">#{c.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs truncate">{c.title}</td>
                          <td className="py-3 px-4 text-slate-600">Ward {c.wardNumber} ({c.wardName || "Area"})</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              c.priority === "Critical" || c.priority === "Emergency" ? "bg-red-100 text-red-700" :
                              c.priority === "High" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {c.priority}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{c.assignedTechnicianName || "Unassigned"}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                              c.status === "Resolved" || c.status === "Closed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedComplaint(c);
                                setAssignTechId(c.assignedTechnicianId || "");
                                setUpdateStatusVal(c.status);
                              }}
                              className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-semibold transition-colors"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "technicians" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Department Technicians & Field Staff</h2>
              <p className="text-xs text-slate-500">Personnel assigned to {currentDept?.name}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technicians.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                  No technicians registered under this department yet.
                </div>
              ) : (
                technicians.map(t => (
                  <div key={t.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
                        {t.name.charAt(0)}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        t.status === "available" ? "bg-emerald-100 text-emerald-700" :
                        t.status === "busy" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                      }`}>
                        {t.status}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">{t.name}</h3>
                      <p className="text-xs text-slate-500">{t.departmentName}</p>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.phone || "No phone recorded"}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.email || "No email recorded"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg text-center text-xs">
                      <div>
                        <p className="text-slate-500 text-[10px]">Active Tasks</p>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{t.activeTasks}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-[10px]">Completed</p>
                        <p className="font-bold text-emerald-600 text-sm mt-0.5">{t.completedTasks}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "scheduler" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Department Operational Scheduler</h2>
              <p className="text-xs text-slate-500">Manage site visits, maintenance schedules, and team deployments</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <MunicipalCalendar currentUser={currentUser} onAddToast={onAddToast} />
            </div>
          </div>
        )}

        {activeTab === "sla" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Department SLA & Performance Monitoring</h2>
              <p className="text-xs text-slate-500">Track resolution times, overdue dockets, and compliance benchmarks</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">SLA Compliance Rate</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{slaCompliance}%</p>
                <p className="text-xs text-slate-500 mt-2">Target benchmark: &gt;85% resolved within 72 hours.</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">Average Resolution Time</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">38.4 Hours</p>
                <p className="text-xs text-slate-500 mt-2">Measured from docket logging to municipal closure.</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
                <p className="text-xs font-semibold text-slate-500 uppercase">Overdue Cases (&gt;72h)</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {complaints.filter(c => c.status !== "Resolved" && c.status !== "Closed" && Date.now() - new Date(c.dateReported).getTime() > 72 * 3600 * 1000).length}
                </p>
                <p className="text-xs text-slate-500 mt-2">Requires immediate escalation or technician dispatch.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
            <InternalChat currentUser={currentUser} onAddToast={onAddToast} />
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Notifications</h2>
                <p className="text-xs text-slate-500">Alerts and municipal dispatches</p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={async () => {
                    for (const n of notifications) {
                      await deleteNotification(n.id);
                    }
                    setNotifications([]);
                    onAddToast("Cleared", "All notifications cleared.", "info");
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No notifications right now.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="p-4 flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{n.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                      <span className="text-[10px] text-slate-400 mt-1 inline-block">{new Date(n.timestamp).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await deleteNotification(n.id);
                        setNotifications(prev => prev.filter(item => item.id !== n.id));
                      }}
                      className="text-slate-400 hover:text-red-600 text-xs"
                    >
                      Dismiss
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
              <img src={currentUser.profilePicture} alt={currentUser.name} className="w-20 h-20 rounded-full object-cover border-2 border-blue-600" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">{currentUser.name}</h3>
                <p className="text-xs text-blue-600 font-semibold">Sub-Admin Manager • {currentDept?.name}</p>
                <p className="text-xs text-slate-500 mt-1">Employee Number: {currentUser.employeeNumber || "EMP-SUB-001"}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs border-t border-slate-100 pt-4">
              <div>
                <span className="font-semibold text-slate-500">Email Address:</span>
                <p className="text-slate-900 mt-0.5">{currentUser.email}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Phone Number:</span>
                <p className="text-slate-900 mt-0.5">{currentUser.phone || "Not provided"}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Physical Address:</span>
                <p className="text-slate-900 mt-0.5">{currentUser.physicalAddress || "Thulamela Civic Centre"}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-xl mx-auto space-y-6">
            <h3 className="text-base font-bold text-slate-900">Sub-Admin Portal Settings</h3>
            <p className="text-xs text-slate-500">Department operational preferences and security settings.</p>
          </div>
        )}
      </main>

      {/* Complaint Management Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-blue-400 font-bold">Docket #{selectedComplaint.id}</span>
                <h3 className="text-lg font-bold">{selectedComplaint.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedComplaint(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateComplaint} className="p-6 space-y-5 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <p><strong className="text-slate-700">Citizen Description:</strong> {selectedComplaint.description}</p>
                <p><strong className="text-slate-700">Location / Ward:</strong> Ward {selectedComplaint.wardNumber} ({selectedComplaint.wardName || "Area"})</p>
                <p><strong className="text-slate-700">Category:</strong> {selectedComplaint.category} / {selectedComplaint.subCategory || "General"}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assign Technician ({currentDept?.name})</label>
                  <select
                    value={assignTechId}
                    onChange={(e) => setAssignTechId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Unassigned --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operational Status</label>
                  <select
                    value={updateStatusVal}
                    onChange={(e) => setUpdateStatusVal(e.target.value as ComplaintStatus)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="New">New</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting for Parts">Waiting for Parts</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operational Notes / Dispatch Instructions</label>
                <textarea
                  rows={3}
                  value={subAdminNotes}
                  onChange={(e) => setSubAdminNotes(e.target.value)}
                  placeholder="Enter dispatch instructions or status notes..."
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
