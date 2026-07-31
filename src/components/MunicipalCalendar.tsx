import React, { useState, useEffect } from "react";
import { 
  getCalendarEvents, 
  saveSingleCalendarEvent,
  deleteCalendarEvent, 
  getWards, 
  getTechnicians,
  getDepartments,
  getUsers,
  addAuditLog,
  saveSingleNotification
} from "../db";
import { CalendarEvent, Ward, Technician, Department, User, Notification } from "../types";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  MapPin, 
  Filter, 
  Grid, 
  List, 
  Trash2, 
  CheckCircle, 
  Users, 
  AlertTriangle,
  X,
  Edit3,
  CalendarDays,
  Building2,
  UserCheck,
  FileText,
  Tag,
  Shield,
  RotateCcw,
  Check
} from "lucide-react";

interface MunicipalCalendarProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type ViewType = "month" | "week" | "day" | "agenda";

export default function MunicipalCalendar({ currentUser, onAddToast }: MunicipalCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  // Open on the user's actual current month/date
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<ViewType>("month");

  // Selection modals
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<CalendarEvent["type"] | "">("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formDeptId, setFormDeptId] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formWard, setFormWard] = useState<string>("");
  const [formAssignedUser, setFormAssignedUser] = useState("");
  const [formStatus, setFormStatus] = useState<CalendarEvent["status"] | "">("");
  const [formComplaintId, setFormComplaintId] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Filtering States
  const isSubAdmin = currentUser.role === "sub_admin";
  const isTechnician = currentUser.role === "technician";
  const isCouncillor = currentUser.role === "councillor";

  const [deptFilter, setDeptFilter] = useState<string>(isSubAdmin ? (currentUser.departmentId || "All") : "All");
  const [wardFilter, setWardFilter] = useState<string>(isCouncillor && currentUser.wardNumber ? String(currentUser.wardNumber) : "All");
  const [techFilter, setTechFilter] = useState<string>(isTechnician ? currentUser.id : "All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");

  const wards: Ward[] = getWards();
  const technicians: Technician[] = getTechnicians();
  const departments: Department[] = getDepartments();
  const users: User[] = getUsers();

  const loadEvents = () => {
    setEvents(getCalendarEvents());
  };

  useEffect(() => {
    loadEvents();
    window.addEventListener("thulamela_db_update", loadEvents);
    return () => window.removeEventListener("thulamela_db_update", loadEvents);
  }, []);

  // Update deptFilter if Sub-Admin department changes
  useEffect(() => {
    if (isSubAdmin && currentUser.departmentId) {
      setDeptFilter(currentUser.departmentId);
    }
  }, [currentUser, isSubAdmin]);

  // Date Calculation Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  // Calendar Navigation
  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const prevWeek = () => {
    setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const nextDay = () => {
    setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
  };

  const prevDay = () => {
    setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
  };

  // Role Checks
  const canCreateSchedule = () => {
    if (currentUser.role === "super_admin" || currentUser.role === "municipal_admin") return true;
    if (currentUser.role === "sub_admin" && currentUser.departmentId) return true;
    return false;
  };

  const canEditSchedule = (event: CalendarEvent) => {
    if (currentUser.role === "super_admin" || currentUser.role === "municipal_admin") return true;
    if (currentUser.role === "sub_admin" && currentUser.departmentId && event.departmentId === currentUser.departmentId) return true;
    return false;
  };

  const canDeleteSchedule = (event: CalendarEvent) => {
    if (currentUser.role === "super_admin" || currentUser.role === "municipal_admin") return true;
    if (currentUser.role === "sub_admin" && currentUser.departmentId && event.departmentId === currentUser.departmentId) return true;
    return false;
  };

  // Filtered Events
  const filteredEvents = events.filter(e => {
    // 1. Role Scope Constraints
    if (isSubAdmin && currentUser.departmentId) {
      if (e.departmentId && e.departmentId !== currentUser.departmentId) return false;
    }
    if (isTechnician) {
      // Tech filter state check
      if (techFilter === currentUser.id && e.assignedUserId !== currentUser.id) return false;
    }
    if (isCouncillor && currentUser.wardNumber) {
      if (wardFilter !== "All" && e.wardNumber && e.wardNumber !== Number(wardFilter)) return false;
    }

    // 2. User Selected Filters
    if (deptFilter !== "All" && e.departmentId && e.departmentId !== deptFilter) return false;
    if (wardFilter !== "All" && e.wardNumber && e.wardNumber !== Number(wardFilter)) return false;
    if (techFilter !== "All" && e.assignedUserId && e.assignedUserId !== techFilter) return false;
    if (statusFilter !== "All") {
      const currentStatus = e.status || "Scheduled";
      if (currentStatus !== statusFilter) return false;
    }
    if (typeFilter !== "All" && e.type !== typeFilter) return false;

    return true;
  });

  // Open Create Form
  const openCreateModalForDate = (dateObj?: Date) => {
    if (!canCreateSchedule()) {
      onAddToast("Permission Denied", "Your role does not have administrative scheduling privileges.", "warning");
      return;
    }

    const targetDate = dateObj || currentDate;
    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const defaultStart = `${year}-${month}-${day}T09:00`;
    const defaultEnd = `${year}-${month}-${day}T11:00`;

    setEditingEvent(null);
    setFormTitle("");
    setFormType(""); // Start empty for placeholder "Select event type"
    setFormStartDate(defaultStart);
    setFormEndDate(defaultEnd);
    setFormDeptId(isSubAdmin ? (currentUser.departmentId || "") : ""); // Placeholder or Sub-Admin's dept
    setFormLocation("");
    setFormWard(""); // Placeholder "Select ward"
    setFormAssignedUser(""); // Placeholder "Select technician"
    setFormStatus("Scheduled");
    setFormComplaintId("");
    setFormDescription("");

    setShowCreateModal(true);
  };

  // Open Edit Form
  const openEditModal = (evt: CalendarEvent) => {
    if (!canEditSchedule(evt)) {
      onAddToast("Permission Denied", "You are not authorized to edit this schedule item.", "warning");
      return;
    }

    setEditingEvent(evt);
    setFormTitle(evt.title || "");
    setFormType(evt.type || "");
    setFormStartDate(evt.startDate ? new Date(evt.startDate).toISOString().slice(0, 16) : "");
    setFormEndDate(evt.endDate ? new Date(evt.endDate).toISOString().slice(0, 16) : "");
    setFormDeptId(evt.departmentId || (isSubAdmin ? (currentUser.departmentId || "") : ""));
    setFormLocation(evt.location || "");
    setFormWard(evt.wardNumber ? String(evt.wardNumber) : "");
    setFormAssignedUser(evt.assignedUserId || "");
    setFormStatus(evt.status || "Scheduled");
    setFormComplaintId(evt.complaintId || "");
    setFormDescription(evt.description || "");

    setSelectedEvent(null);
    setShowCreateModal(true);
  };

  // Form Submission
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formTitle.trim()) {
      onAddToast("Validation Alert", "Please enter an Event Title.", "warning");
      return;
    }
    if (!formType) {
      onAddToast("Validation Alert", "Please select an Event Type.", "warning");
      return;
    }
    if (!formLocation.trim()) {
      onAddToast("Validation Alert", "Please enter a Location.", "warning");
      return;
    }
    if (!formStartDate || !formEndDate) {
      onAddToast("Validation Alert", "Please enter valid Start and End times.", "warning");
      return;
    }

    // Sub-Admin Department Enforcement
    const deptIdToSave = isSubAdmin ? (currentUser.departmentId || formDeptId) : formDeptId;
    const deptObj = departments.find(d => d.id === deptIdToSave);
    const techObj = technicians.find(t => t.id === formAssignedUser) || users.find(u => u.id === formAssignedUser);

    const eventId = editingEvent ? editingEvent.id : `evt-${Date.now()}`;

    const eventPayload: CalendarEvent = {
      id: eventId,
      title: formTitle.trim(),
      description: formDescription.trim(),
      type: formType as CalendarEvent["type"],
      startDate: new Date(formStartDate).toISOString(),
      endDate: new Date(formEndDate).toISOString(),
      location: formLocation.trim(),
      departmentId: deptIdToSave || undefined,
      departmentName: deptObj ? deptObj.name : undefined,
      status: (formStatus as CalendarEvent["status"]) || "Scheduled",
      wardNumber: formWard ? Number(formWard) : undefined,
      assignedUserId: formAssignedUser || undefined,
      assignedUserName: techObj ? techObj.name : undefined,
      complaintId: formComplaintId.trim() || undefined,
      createdById: editingEvent ? editingEvent.createdById : currentUser.id,
      createdByName: editingEvent ? editingEvent.createdByName : currentUser.name,
      dateCreated: editingEvent ? editingEvent.dateCreated : new Date().toISOString(),
    };

    await saveSingleCalendarEvent(eventPayload);

    // Audit Logging
    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      editingEvent ? "Update Calendar Event" : "Create Calendar Event",
      `${editingEvent ? "Updated" : "Created"} schedule '${formTitle}' for ${deptObj ? deptObj.name : "Department"}`
    );

    // Notification Trigger (Notify Technician/Staff if assigned)
    if (formAssignedUser && formAssignedUser !== currentUser.id) {
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        userId: formAssignedUser,
        role: "technician",
        title: `Schedule Assignment: ${formTitle}`,
        message: `You have been assigned to '${formTitle}' on ${new Date(formStartDate).toLocaleDateString("en-ZA")} at ${formLocation}.`,
        type: "info",
        isRead: false,
        timestamp: new Date().toISOString(),
        complaintId: formComplaintId || undefined,
      };
      await saveSingleNotification(notif);
    }

    onAddToast(
      editingEvent ? "Schedule Updated" : "Schedule Created",
      `The operational schedule item '${formTitle}' has been successfully saved.`,
      "success"
    );

    setShowCreateModal(false);
    setEditingEvent(null);
  };

  // Status Quick Update Handler
  const handleUpdateStatus = async (evt: CalendarEvent, newStatus: CalendarEvent["status"]) => {
    const updatedEvt: CalendarEvent = {
      ...evt,
      status: newStatus
    };
    await saveSingleCalendarEvent(updatedEvt);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Update Event Status",
      `Changed status of '${evt.title}' to ${newStatus}`
    );

    onAddToast("Status Updated", `Schedule status set to ${newStatus}.`, "info");
    if (selectedEvent?.id === evt.id) {
      setSelectedEvent(updatedEvt);
    }
  };

  // Cancellation Handler
  const handleCancelSchedule = async (evt: CalendarEvent) => {
    if (!canEditSchedule(evt)) {
      onAddToast("Permission Denied", "You cannot cancel this schedule.", "warning");
      return;
    }

    await handleUpdateStatus(evt, "Cancelled");
  };

  // Delete Handler
  const handleDeleteSchedule = async (id: string) => {
    const evt = events.find(e => e.id === id);
    if (evt && !canDeleteSchedule(evt)) {
      onAddToast("Permission Denied", "Only administrators can delete calendar schedule items.", "error");
      return;
    }

    await deleteCalendarEvent(id);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Delete Event",
      `Deleted calendar event #${id}`
    );

    onAddToast("Event Removed", "The schedule item has been removed.", "info");
    setSelectedEvent(null);
  };

  // Badge Styling Helpers
  const getEventBadgeColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "inspection": return "bg-blue-100 text-blue-800 border-blue-200";
      case "technician_visit": return "bg-orange-100 text-orange-800 border-orange-200 font-bold";
      case "community_meeting": return "bg-emerald-100 text-emerald-800 border-emerald-200 font-bold";
      case "event": return "bg-purple-100 text-purple-800 border-purple-200";
      case "deadline": return "bg-red-100 text-red-800 border-red-200";
      case "maintenance": return "bg-slate-100 text-slate-800 border-slate-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBadgeColor = (status?: CalendarEvent["status"]) => {
    switch (status) {
      case "Scheduled": return "bg-blue-50 text-blue-700 border-blue-200";
      case "In Progress": return "bg-amber-50 text-amber-700 border-amber-200 font-bold";
      case "Completed": return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
      case "Cancelled": return "bg-rose-50 text-rose-700 border-rose-200 line-through";
      default: return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  // 1. RENDER MONTH GRID VIEW
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const allCells = [...blanks, ...days];

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === currentDate.getFullYear() && now.getMonth() === currentDate.getMonth();
    const todayDate = now.getDate();

    return (
      <div className="space-y-3">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center font-black uppercase text-[10px] text-slate-500 tracking-wider">
          <span className="text-red-500">Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* 7-Column Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 auto-rows-fr min-h-[420px]">
          {allCells.map((day, idx) => {
            if (day === null) {
              return <div key={`blank-${idx}`} className="bg-slate-50/50 rounded-xl border border-slate-100/60 opacity-30"></div>;
            }

            const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday = isCurrentMonth && day === todayDate;

            // Match events on this day
            const dayEvents = filteredEvents.filter(e => {
              if (!e.startDate) return false;
              const eDate = new Date(e.startDate);
              return eDate.getDate() === day && 
                     eDate.getMonth() === currentDate.getMonth() && 
                     eDate.getFullYear() === currentDate.getFullYear();
            });

            return (
              <div 
                key={`day-${day}`} 
                onClick={() => setSelectedDayDate(dayDate)}
                className={`bg-white border rounded-xl p-2 flex flex-col justify-between transition-all cursor-pointer group hover:border-gov-green hover:shadow-md ${
                  isToday ? "border-gov-green border-2 bg-emerald-50/30 ring-2 ring-emerald-500/20" : "border-slate-100"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                    isToday ? "bg-gov-green text-white font-black shadow-sm" : "text-slate-800 group-hover:bg-slate-100"
                  }`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gov-blue/10 text-gov-blue rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                <div className="flex-grow space-y-1 mt-1 max-h-[60px] overflow-y-auto text-[9px] no-scrollbar">
                  {dayEvents.slice(0, 3).map(de => (
                    <div 
                      key={de.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(de);
                      }}
                      className={`px-1.5 py-0.5 rounded border truncate transition-transform hover:scale-[1.02] ${getEventBadgeColor(de.type)}`}
                      title={`${de.title} (${de.location})`}
                    >
                      {de.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[8px] font-bold text-slate-400 pl-1">
                      +{dayEvents.length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. RENDER WEEK VIEW
  const renderWeekView = () => {
    // Generate 7 days for the current week starting from Sunday
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }

    const now = new Date();

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {weekDays.map((wDay, idx) => {
          const isToday = now.toDateString() === wDay.toDateString();
          const dayEvents = filteredEvents.filter(e => {
            if (!e.startDate) return false;
            const eDate = new Date(e.startDate);
            return eDate.toDateString() === wDay.toDateString();
          });

          return (
            <div 
              key={idx}
              onClick={() => setSelectedDayDate(wDay)}
              className={`bg-white border rounded-xl p-3 min-h-[300px] flex flex-col space-y-2 cursor-pointer hover:border-gov-green transition-all ${
                isToday ? "border-gov-green border-2 bg-emerald-50/20" : "border-slate-100"
              }`}
            >
              <div className="border-b border-slate-100 pb-2 text-center">
                <p className="text-[10px] font-black uppercase text-slate-400">
                  {wDay.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-sm font-bold ${isToday ? "text-gov-green font-black" : "text-slate-800"}`}>
                  {wDay.getDate()} {wDay.toLocaleDateString("en-US", { month: "short" })}
                </p>
              </div>

              <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[280px]">
                {dayEvents.length === 0 ? (
                  <p className="text-[10px] text-slate-300 text-center italic py-4">No events</p>
                ) : (
                  dayEvents.map(e => (
                    <div
                      key={e.id}
                      onClick={(evt) => {
                        evt.stopPropagation();
                        setSelectedEvent(e);
                      }}
                      className="p-2 rounded-lg border bg-slate-50 hover:bg-white text-[10px] space-y-1 border-slate-200 transition-all shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded uppercase font-bold text-[8px] border ${getEventBadgeColor(e.type)}`}>
                          {e.type.replace("_", " ")}
                        </span>
                        <span className={`px-1 py-0.5 rounded text-[8px] border ${getStatusBadgeColor(e.status)}`}>
                          {e.status || "Scheduled"}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800 line-clamp-2">{e.title}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        {new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 3. RENDER DAY VIEW
  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(e => {
      if (!e.startDate) return false;
      const eDate = new Date(e.startDate);
      return eDate.toDateString() === currentDate.toDateString();
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h4 className="font-black text-base text-slate-900">
              {currentDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </h4>
            <p className="text-xs text-slate-500">{dayEvents.length} operational schedules for this day</p>
          </div>

          {canCreateSchedule() && (
            <button
              onClick={() => openCreateModalForDate(currentDate)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gov-green text-white rounded-lg text-xs font-bold shadow-sm hover:bg-gov-green-hover"
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          )}
        </div>

        {dayEvents.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <CalendarIcon className="mx-auto text-slate-300" size={36} />
            <p className="text-xs font-bold text-slate-500">No schedules recorded for this date.</p>
            {canCreateSchedule() && (
              <button
                onClick={() => openCreateModalForDate(currentDate)}
                className="text-xs text-gov-blue hover:underline font-bold"
              >
                + Click here to create a new schedule
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(e => (
              <div 
                key={e.id}
                onClick={() => setSelectedEvent(e)}
                className="p-4 rounded-xl border border-slate-100 hover:border-gov-green bg-slate-50/50 hover:bg-white transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${getEventBadgeColor(e.type)}`}>
                      {e.type.replace("_", " ")}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadgeColor(e.status)}`}>
                      {e.status || "Scheduled"}
                    </span>
                    {e.departmentName && (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {e.departmentName}
                      </span>
                    )}
                    {e.wardNumber && (
                      <span className="text-[10px] font-bold text-gov-blue">Ward {e.wardNumber}</span>
                    )}
                  </div>
                  <h5 className="font-bold text-slate-900 text-sm">{e.title}</h5>
                  <p className="text-xs text-slate-500">{e.description}</p>
                </div>

                <div className="flex flex-col sm:items-end text-xs space-y-1 text-slate-600 font-mono">
                  <div className="flex items-center space-x-1">
                    <Clock size={13} className="text-slate-400" />
                    <span>
                      {new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(e.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin size={13} className="text-slate-400" />
                    <span className="font-sans font-bold">{e.location}</span>
                  </div>
                  {e.assignedUserName && (
                    <div className="flex items-center space-x-1 text-slate-700 font-sans">
                      <UserCheck size={13} className="text-gov-green" />
                      <span className="font-semibold">{e.assignedUserName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 4. RENDER AGENDA VIEW
  const renderAgendaView = () => {
    const sorted = [...filteredEvents].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No events match the active filters.
          </div>
        ) : (
          sorted.map(e => (
            <div 
              key={e.id}
              onClick={() => setSelectedEvent(e)}
              className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50/80 transition-all space-y-3 sm:space-y-0 cursor-pointer hover:border-gov-green shadow-2xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${getEventBadgeColor(e.type)}`}>
                    {e.type.replace("_", " ")}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadgeColor(e.status)}`}>
                    {e.status || "Scheduled"}
                  </span>
                  {e.departmentName && (
                    <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {e.departmentName}
                    </span>
                  )}
                  {e.complaintId && (
                    <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded font-black">
                      {e.complaintId}
                    </span>
                  )}
                  {e.wardNumber && (
                    <span className="text-[10px] text-gov-blue font-bold">Ward {e.wardNumber}</span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{e.title}</h4>
                <p className="text-[10px] text-slate-500 line-clamp-1">{e.description}</p>
              </div>

              <div className="flex flex-col sm:items-end text-[10px] space-y-1 text-slate-500 font-mono">
                <div className="flex items-center space-x-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>
                    {new Date(e.startDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })} @ {new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin size={12} className="text-slate-400" />
                  <span className="font-sans font-bold">{e.location}</span>
                </div>
                {e.assignedUserName && (
                  <div className="flex items-center space-x-1 text-slate-700 font-sans">
                    <UserCheck size={11} className="text-gov-green" />
                    <span>{e.assignedUserName}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-6">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 space-y-4 sm:space-y-0">
        <div>
          <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center">
            <CalendarIcon className="mr-2 text-gov-green" size={18} />
            <span>Municipal Service Dispatch Scheduler</span>
          </h3>
          <p className="text-[10px] text-slate-500">Interactive operational dispatch and scheduling board for Thulamela Municipality.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Today Button */}
          <button
            onClick={handleToday}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-colors"
          >
            Today
          </button>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={view === "month" ? prevMonth : view === "week" ? prevWeek : prevDay}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
              title="Previous"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-bold px-2 uppercase tracking-wide text-slate-700">
              {view === "month" 
                ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : view === "day"
                ? currentDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Active Schedule"
              }
            </span>
            <button 
              onClick={view === "month" ? nextMonth : view === "week" ? nextWeek : nextDay}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
              title="Next"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* View Mode Switches */}
          <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[9px] font-black uppercase">
            <button 
              onClick={() => setView("month")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${view === "month" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Month Grid
            </button>
            <button 
              onClick={() => setView("week")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${view === "week" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Week Grid
            </button>
            <button 
              onClick={() => setView("day")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${view === "day" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Day View
            </button>
            <button 
              onClick={() => setView("agenda")}
              className={`px-2.5 py-1.5 rounded-lg transition-all ${view === "agenda" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
            >
              Agenda Feed
            </button>
          </div>

          {/* Create Event Button */}
          {canCreateSchedule() && (
            <button
              onClick={() => openCreateModalForDate()}
              className="flex items-center space-x-1 px-3 py-2 bg-gov-green hover:bg-gov-green-hover text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-gov-green/10"
            >
              <Plus size={12} />
              <span>Create Schedule</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Comprehensive Filter Toolbar */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3 text-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-1.5">
            <Filter size={14} className="text-gov-blue" />
            <span className="font-bold text-slate-700 uppercase text-[10px]">Filter Options:</span>
            {isSubAdmin && (
              <span className="bg-amber-100 text-amber-800 text-[9px] px-2 py-0.5 rounded font-bold border border-amber-200">
                Scoped to your department
              </span>
            )}
            {isTechnician && (
              <span className="bg-blue-100 text-blue-800 text-[9px] px-2 py-0.5 rounded font-bold border border-blue-200">
                Technician View
              </span>
            )}
            {isCouncillor && (
              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded font-bold border border-emerald-200">
                Ward Scope
              </span>
            )}
          </div>

          {/* Reset Filters */}
          {(deptFilter !== "All" || wardFilter !== "All" || techFilter !== "All" || statusFilter !== "All" || typeFilter !== "All") && (
            <button
              onClick={() => {
                setDeptFilter(isSubAdmin ? (currentUser.departmentId || "All") : "All");
                setWardFilter(isCouncillor && currentUser.wardNumber ? String(currentUser.wardNumber) : "All");
                setTechFilter(isTechnician ? currentUser.id : "All");
                setStatusFilter("All");
                setTypeFilter("All");
              }}
              className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center space-x-1 font-bold"
            >
              <RotateCcw size={10} />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {/* Department Filter */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              disabled={isSubAdmin}
              className={`w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-gov-green ${
                isSubAdmin ? "opacity-75 bg-slate-100 cursor-not-allowed" : ""
              }`}
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Ward Filter */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Ward</label>
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-gov-green"
            >
              <option value="All">All Wards</option>
              {wards.map(w => (
                <option key={w.wardNumber} value={w.wardNumber}>Ward {w.wardNumber} - {w.wardName}</option>
              ))}
            </select>
          </div>

          {/* Technician Filter */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Assigned Staff</label>
            <select
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-gov-green"
            >
              <option value="All">All Staff</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-gov-green"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Category/Type Filter */}
          <div>
            <label className="text-[9px] font-bold text-slate-500 block mb-1 uppercase">Event Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:border-gov-green"
            >
              <option value="All">All Event Types</option>
              <option value="inspection">Site Inspection</option>
              <option value="technician_visit">Technician Repair Visit</option>
              <option value="community_meeting">Community Ward Forum</option>
              <option value="deadline">Task Deadline</option>
              <option value="maintenance">Maintenance</option>
              <option value="event">General Event</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Main Stage */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        {view === "month" && renderMonthView()}
        {view === "week" && renderWeekView()}
        {view === "day" && renderDayView()}
        {view === "agenda" && renderAgendaView()}
      </div>

      {/* MODAL 1: DAY SUMMARY PANEL */}
      {selectedDayDate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black text-slate-900 text-sm">
                  {selectedDayDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </h4>
                <p className="text-[10px] text-slate-500">Day Summary & Scheduled Operations</p>
              </div>
              <button
                onClick={() => setSelectedDayDate(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* List events for clicked day */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(() => {
                const dayEvts = filteredEvents.filter(e => {
                  if (!e.startDate) return false;
                  const ed = new Date(e.startDate);
                  return ed.toDateString() === selectedDayDate.toDateString();
                });

                if (dayEvts.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No schedules for this date.
                    </div>
                  );
                }

                return dayEvts.map(de => (
                  <div
                    key={de.id}
                    onClick={() => {
                      setSelectedEvent(de);
                      setSelectedDayDate(null);
                    }}
                    className="p-3 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-gov-green transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${getEventBadgeColor(de.type)}`}>
                        {de.type.replace("_", " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadgeColor(de.status)}`}>
                        {de.status || "Scheduled"}
                      </span>
                    </div>
                    <p className="font-bold text-slate-800 text-xs">{de.title}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>{new Date(de.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-sans font-semibold text-slate-700">{de.location}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedDayDate(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
              >
                Close
              </button>

              {canCreateSchedule() && (
                <button
                  onClick={() => {
                    const targetD = selectedDayDate;
                    setSelectedDayDate(null);
                    openCreateModalForDate(targetD);
                  }}
                  className="px-4 py-2 bg-gov-green text-white rounded-lg text-xs font-bold shadow-sm hover:bg-gov-green-hover flex items-center space-x-1"
                >
                  <Plus size={14} />
                  <span>Add Schedule</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${getEventBadgeColor(selectedEvent.type)}`}>
                    {selectedEvent.type.replace("_", " ")}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getStatusBadgeColor(selectedEvent.status)}`}>
                    {selectedEvent.status || "Scheduled"}
                  </span>
                </div>
                <h3 className="font-black text-slate-900 text-base">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Start Time</span>
                  <p className="font-mono font-bold text-slate-800">
                    {new Date(selectedEvent.startDate).toLocaleString("en-ZA")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">End Time</span>
                  <p className="font-mono font-bold text-slate-800">
                    {new Date(selectedEvent.endDate).toLocaleString("en-ZA")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Location</span>
                  <p className="font-bold text-slate-800">{selectedEvent.location}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Ward Number</span>
                  <p className="font-bold text-gov-blue">{selectedEvent.wardNumber ? `Ward ${selectedEvent.wardNumber}` : "Not specified"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Department</span>
                  <p className="font-bold text-slate-800">{selectedEvent.departmentName || "General Municipal"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Assigned Staff</span>
                  <p className="font-bold text-slate-800">{selectedEvent.assignedUserName || "Unassigned"}</p>
                </div>
                {selectedEvent.complaintId && (
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Linked Complaint Ref</span>
                    <p className="font-mono font-bold text-slate-900 bg-slate-200 px-2 py-0.5 rounded inline-block">
                      {selectedEvent.complaintId}
                    </p>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Details / Agenda Notes</span>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-600">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Status Update Quick Bar for Staff */}
              {canEditSchedule(selectedEvent) && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Update Status</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(["Scheduled", "In Progress", "Completed", "Cancelled"] as CalendarEvent["status"][]).map(st => (
                      <button
                        key={st}
                        onClick={() => handleUpdateStatus(selectedEvent, st)}
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                          selectedEvent.status === st 
                            ? "bg-slate-900 text-white border-slate-900" 
                            : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div className="flex space-x-2">
                {canEditSchedule(selectedEvent) && (
                  <button
                    onClick={() => openEditModal(selectedEvent)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Edit3 size={13} />
                    <span>Edit Event</span>
                  </button>
                )}
                {canDeleteSchedule(selectedEvent) && (
                  <button
                    onClick={() => handleDeleteSchedule(selectedEvent.id)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center space-x-1"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE / EDIT SCHEDULE FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-100 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-black uppercase text-xs text-slate-800 tracking-wider">
                  {editingEvent ? "Edit Operational Schedule" : "Create Operational Schedule"}
                </h4>
                <p className="text-[10px] text-slate-500">Dispatch inspection visits, technician repairs, and ward forums.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Title */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 block">Event Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Ward 12 Water Pipe Inspection"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
                  required
                />
              </div>

              {/* Event Type Dropdown - Global Rule: Placeholder starts with "Select..." */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Event Type *</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CalendarEvent["type"])}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
                  required
                >
                  <option value="">Select event type</option>
                  <option value="inspection">Site Inspection</option>
                  <option value="technician_visit">Technician Repair Visit</option>
                  <option value="community_meeting">Community Ward Forum</option>
                  <option value="deadline">Task Deadline</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="event">General Event</option>
                </select>
              </div>

              {/* Department Dropdown - Global Rule: Placeholder starts with "Select...", locked for Sub-Admin */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Department *</label>
                <select
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(e.target.value)}
                  disabled={isSubAdmin}
                  className={`w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green ${
                    isSubAdmin ? "bg-slate-100 opacity-80 cursor-not-allowed" : ""
                  }`}
                  required
                >
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {isSubAdmin && (
                  <p className="text-[9px] text-amber-700 italic">Constrained to your assigned department</p>
                )}
              </div>

              {/* Location */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Location *</label>
                <input
                  type="text"
                  placeholder="e.g. Makwarela Substation"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
                  required
                />
              </div>

              {/* Status Dropdown - Global Rule: Placeholder starts with "Select..." */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Status *</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as CalendarEvent["status"])}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
                  required
                >
                  <option value="">Select status</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Start Date / Time */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Start Date/Time *</label>
                <input
                  type="datetime-local"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green font-mono"
                  required
                />
              </div>

              {/* End Date / Time */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">End Date/Time *</label>
                <input
                  type="datetime-local"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green font-mono"
                  required
                />
              </div>

              {/* Target Ward Dropdown - Global Rule: Placeholder starts with "Select..." */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Target Ward (Optional)</label>
                <select
                  value={formWard}
                  onChange={(e) => setFormWard(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
                >
                  <option value="">Select ward</option>
                  {wards.map(w => (
                    <option key={w.wardNumber} value={w.wardNumber}>Ward {w.wardNumber} - {w.wardName}</option>
                  ))}
                </select>
              </div>

              {/* Assigned Staff Dropdown - Global Rule: Placeholder starts with "Select..." */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Assigned Technician/Staff (Optional)</label>
                <select
                  value={formAssignedUser}
                  onChange={(e) => setFormAssignedUser(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
                >
                  <option value="">Select technician</option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.departmentName})</option>
                  ))}
                </select>
              </div>

              {/* Reference Complaint ID */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 block">Reference Complaint ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. COMP-1001"
                  value={formComplaintId}
                  onChange={(e) => setFormComplaintId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green font-mono"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2 space-y-1">
                <label className="font-bold text-slate-700 block">Details / Notes</label>
                <textarea
                  placeholder="Provide additional details, access requirements, or inspection checklists..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 h-20 focus:outline-none focus:border-gov-green text-xs"
                />
              </div>

              <div className="md:col-span-2 flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow text-xs flex items-center space-x-1"
                >
                  <Check size={14} />
                  <span>{editingEvent ? "Update Schedule" : "Save Schedule"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
