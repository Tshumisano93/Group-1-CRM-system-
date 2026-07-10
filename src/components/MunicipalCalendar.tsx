import React, { useState, useEffect } from "react";
import { 
  getCalendarEvents, 
  saveCalendarEvents, 
  getWards, 
  getTechnicians,
  addAuditLog 
} from "../db";
import { CalendarEvent, Ward, Technician, User } from "../types";
import { 
  Calendar, 
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
  AlertTriangle 
} from "lucide-react";

interface MunicipalCalendarProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type ViewType = "month" | "week" | "day" | "agenda";

export default function MunicipalCalendar({ currentUser, onAddToast }: MunicipalCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 6, 10)); // Default near our mock timestamps (July 2026)
  const [view, setView] = useState<ViewType>("month");
  
  // Filtering states
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  
  // Schedule event form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState<CalendarEvent["type"]>("inspection");
  const [newStartDate, setNewStartDate] = useState("2026-07-11T09:00");
  const [newEndDate, setNewEndDate] = useState("2026-07-11T11:00");
  const [newLocation, setNewLocation] = useState("");
  const [newWard, setNewWard] = useState<number>(1);
  const [newAssignedUser, setNewAssignedUser] = useState("");
  const [newComplaintId, setNewComplaintId] = useState("");

  const wards = getWards();
  const technicians = getTechnicians();

  const loadEvents = () => {
    setEvents(getCalendarEvents());
  };

  useEffect(() => {
    loadEvents();
    window.addEventListener("thulamela_db_update", loadEvents);
    return () => window.removeEventListener("thulamela_db_update", loadEvents);
  }, []);

  // Format dates helpers
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

  // Filtered Events
  const filteredEvents = events.filter(e => {
    if (categoryFilter === "All") return true;
    return e.type === categoryFilter;
  });

  // Handle schedule submit
  const handleScheduleEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim()) {
      onAddToast("Validation Alert", "Please fill in the Event Title and Location.", "warning");
      return;
    }

    const newEventObj: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      type: newType,
      startDate: new Date(newStartDate).toISOString(),
      endDate: new Date(newEndDate).toISOString(),
      location: newLocation.trim(),
      wardNumber: Number(newWard),
      assignedUserId: newAssignedUser || undefined,
      complaintId: newComplaintId.trim() || undefined
    };

    const allEvts = getCalendarEvents();
    allEvts.push(newEventObj);
    saveCalendarEvents(allEvts);
    setEvents(allEvts);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Schedule Event",
      `Scheduled a new ${newType}: '${newTitle}' scheduled for Ward ${newWard}`
    );

    onAddToast("Meeting Scheduled", `The ${newType} has been successfully registered on the dispatch board.`, "success");
    
    // Reset form
    setNewTitle("");
    setNewDesc("");
    setNewType("inspection");
    setNewLocation("");
    setNewAssignedUser("");
    setNewComplaintId("");
    setShowAddForm(false);
  };

  // Delete event
  const handleDeleteEvent = (id: string) => {
    if (currentUser.role !== "super_admin" && currentUser.role !== "municipal_admin") {
      onAddToast("Privilege Alert", "Only administrators can cancel municipal calendar items.", "error");
      return;
    }

    const allEvts = getCalendarEvents();
    const updated = allEvts.filter(e => e.id !== id);
    saveCalendarEvents(updated);
    setEvents(updated);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Delete Event",
      `Deleted calendar event ${id}`
    );

    onAddToast("Event Cancelled", "The calendar schedule item has been removed.", "info");
  };

  // Render badge colors
  const getEventBadgeColor = (type: CalendarEvent["type"]) => {
    switch (type) {
      case "inspection": return "bg-blue-100 text-blue-800 border-blue-200";
      case "technician_visit": return "bg-orange-100 text-orange-800 border-orange-200 font-bold";
      case "community_meeting": return "bg-gov-green/10 text-gov-green border-gov-green/20 font-black";
      case "event": return "bg-purple-100 text-purple-800 border-purple-200";
      case "deadline": return "bg-red-100 text-red-800 border-red-200 animate-pulse";
      case "maintenance": return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  // Monthly layout generation
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const blanks = Array(firstDay).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const allCells = [...blanks, ...days];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-1 text-center font-black uppercase text-[10px] text-slate-500 tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 h-[350px]">
          {allCells.map((day, idx) => {
            if (day === null) {
              return <div key={`blank-${idx}`} className="bg-slate-50 rounded-xl border border-slate-100 opacity-40"></div>;
            }

            // Find events falling on this day (July 2026 or similar context)
            const dayEvents = filteredEvents.filter(e => {
              const eDate = new Date(e.startDate);
              return eDate.getDate() === day && 
                     eDate.getMonth() === currentDate.getMonth() && 
                     eDate.getFullYear() === currentDate.getFullYear();
            });

            const isToday = day === 10 && currentDate.getMonth() === 6; // Mock July 10, 2026 is today

            return (
              <div 
                key={`day-${day}`} 
                className={`bg-white border rounded-xl p-2 flex flex-col justify-between transition-all group hover:border-gov-green hover:shadow-sm ${
                  isToday ? "border-gov-green border-2 bg-emerald-50/20" : "border-slate-100"
                }`}
              >
                <span className={`text-xs font-bold ${isToday ? "text-gov-green font-black" : "text-slate-800"}`}>
                  {day}
                </span>

                <div className="flex-grow overflow-y-auto space-y-1 mt-1 max-h-[35px] text-[8px]">
                  {dayEvents.map(de => (
                    <div 
                      key={de.id}
                      className={`px-1 rounded-sm truncate ${getEventBadgeColor(de.type)}`}
                      title={`${de.title} (${de.location})`}
                    >
                      {de.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Agenda View
  const renderAgendaView = () => {
    return (
      <div className="space-y-3 max-h-[380px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No events scheduled for the active filters.
          </div>
        ) : (
          filteredEvents
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .map(e => (
              <div 
                key={e.id}
                className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-slate-50 transition-all space-y-3 sm:space-y-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${getEventBadgeColor(e.type)}`}>
                      {e.type.replace("_", " ")}
                    </span>
                    {e.complaintId && (
                      <span className="bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[9px] px-1.5 py-0.5 rounded font-black">
                        {e.complaintId}
                      </span>
                    )}
                    <span className="text-[10px] text-gov-blue font-bold">Ward {e.wardNumber}</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-tight">{e.title}</h4>
                  <p className="text-[10px] text-slate-500">{e.description}</p>
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
                  
                  {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
                    <button
                      onClick={() => handleDeleteEvent(e.id)}
                      className="text-red-500 hover:text-red-700 text-[10px] flex items-center space-x-0.5 pt-1 hover:underline"
                    >
                      <Trash2 size={11} />
                      <span>Cancel Schedule</span>
                    </button>
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
            <Calendar className="mr-2 text-gov-green" size={18} />
            <span>Municipal Service Dispatch Scheduler</span>
          </h3>
          <p className="text-[10px] text-slate-500">Track and dispatch community inspections, technician operations, and ward forums.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Calendar Navigation */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={view === "month" ? prevMonth : view === "week" ? prevWeek : prevDay}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-[10px] font-bold px-2 uppercase tracking-wide text-slate-700">
              {view === "month" 
                ? currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
                : "Active Schedule"
              }
            </span>
            <button 
              onClick={view === "month" ? nextMonth : view === "week" ? nextWeek : nextDay}
              className="p-1 hover:bg-white rounded-lg text-slate-600 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* View Toggles */}
          <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[9px] font-black uppercase">
            <button 
              onClick={() => setView("month")}
              className={`px-3 py-1.5 rounded-lg transition-all ${view === "month" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Month Grid
            </button>
            <button 
              onClick={() => setView("agenda")}
              className={`px-3 py-1.5 rounded-lg transition-all ${view === "agenda" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            >
              Agenda Feed
            </button>
          </div>

          {/* Schedule button */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 px-3 py-2 bg-gov-green hover:bg-gov-green-hover text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-gov-green/10"
          >
            <Plus size={12} />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* 2. Filters Row */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center space-x-1.5">
          <Filter size={14} className="text-gov-blue" />
          <span className="font-bold text-slate-700 uppercase text-[10px]">Filter Board:</span>
        </div>

        <div className="flex flex-wrap gap-1">
          {["All", "inspection", "technician_visit", "community_meeting", "deadline"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase transition-all ${
                categoryFilter === cat 
                  ? "bg-gov-blue text-white border-gov-blue" 
                  : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {cat === "All" ? "All Schedules" : cat.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Event Scheduling Form Panel */}
      {showAddForm && (
        <form onSubmit={handleScheduleEvent} className="bg-slate-50/50 p-5 rounded-2xl border border-dashed border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-3 pb-2 border-b border-slate-200">
            <h4 className="font-black uppercase text-[11px] text-slate-800 tracking-wider">Schedule Operations Appointment</h4>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Event Title *</label>
            <input
              type="text"
              placeholder="e.g. Ward Reservoir Leak Check"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Location *</label>
            <input
              type="text"
              placeholder="e.g. Block D Reservoir"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Event Type *</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as CalendarEvent["type"])}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-gov-green"
            >
              <option value="inspection">Site Inspection</option>
              <option value="technician_visit">Technician Repair Visit</option>
              <option value="community_meeting">Community Ward Forum</option>
              <option value="deadline">Task Deadline</option>
              <option value="event">General Event</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Start Date/Time *</label>
            <input
              type="datetime-local"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">End Date/Time *</label>
            <input
              type="datetime-local"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Target Ward Number *</label>
            <select
              value={newWard}
              onChange={(e) => setNewWard(Number(e.target.value))}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
            >
              {wards.map(w => (
                <option key={w.wardNumber} value={w.wardNumber}>Ward {w.wardNumber} - {w.wardName}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Assigned Staff/Officer (Optional)</label>
            <select
              value={newAssignedUser}
              onChange={(e) => setNewAssignedUser(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
            >
              <option value="">-- No Specific Allocation --</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>Tech: {t.name} ({t.departmentName})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Reference Complaint ID (Optional)</label>
            <input
              type="text"
              placeholder="e.g. COMP-1001"
              value={newComplaintId}
              onChange={(e) => setNewComplaintId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5 md:col-span-3">
            <label className="font-bold text-slate-700 block">Details / Agenda Notes</label>
            <textarea
              placeholder="Brief summary regarding meeting outcomes or inspection checklist items..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 h-14 focus:outline-none"
            />
          </div>

          <div className="md:col-span-3 flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
            >
              Save Schedule
            </button>
          </div>
        </form>
      )}

      {/* 4. Active Calendar Stage */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        {view === "month" ? renderMonthView() : renderAgendaView()}
      </div>

    </div>
  );
}
