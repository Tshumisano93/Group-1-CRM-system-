import React, { useState, useEffect } from "react";
import { 
  getTasks, 
  saveTasks, 
  getTechnicians, 
  getDepartments,
  addAuditLog 
} from "../db";
import { Task, Technician, Department, User } from "../types";
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Plus, 
  Filter, 
  MessageSquare, 
  Paperclip, 
  User as UserIcon, 
  Sliders, 
  Send,
  Trash2,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

interface TaskManagerProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function TaskManager({ currentUser, onAddToast }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filtering states
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [assignedFilter, setAssignedFilter] = useState<string>("All");

  // Form states for creating task
  const [showForm, setShowForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskAssignedId, setTaskAssignedId] = useState("");
  const [taskDeptId, setTaskDeptId] = useState("WATER");
  const [taskPriority, setTaskPriority] = useState<Task["priority"] | "">("");
  const [taskDueDate, setTaskDueDate] = useState("2026-07-15");

  // Active expanded details task (for editing progress/comments)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(50);
  const [newCommentText, setNewCommentText] = useState("");

  const loadData = () => {
    setTasks(getTasks());
    setTechnicians(getTechnicians());
    setDepartments(getDepartments());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("thulamela_db_update", loadData);
    return () => window.removeEventListener("thulamela_db_update", loadData);
  }, []);

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || t.priority === priorityFilter;
    const matchesAssigned = assignedFilter === "All" || t.assignedUserId === assignedFilter || (assignedFilter === "me" && t.assignedUserId === currentUser.id);

    return matchesStatus && matchesPriority && matchesAssigned;
  });

  // Handle task registration
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskAssignedId || !taskPriority) {
      onAddToast("Information Needed", "Please provide a task title, select assigned staff, and select priority.", "warning");
      return;
    }

    const assignedStaff = technicians.find(tech => tech.id === taskAssignedId);
    const assignedName = assignedStaff ? assignedStaff.name : "Assigned Officer";

    const allTasks = getTasks();
    const taskIdNumber = String(allTasks.length + 1).padStart(4, "0");
    const newId = `TSK-${taskIdNumber}`;

    const newTask: Task = {
      id: newId,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      assignedUserId: taskAssignedId,
      assignedUserName: assignedName,
      departmentId: taskDeptId,
      priority: taskPriority,
      status: "Pending",
      startDate: new Date().toISOString(),
      dueDate: new Date(taskDueDate).toISOString(),
      progressPercentage: 0,
      attachments: [],
      comments: []
    };

    allTasks.unshift(newTask);
    saveTasks(allTasks);
    setTasks(allTasks);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Create Dispatch Task",
      `Created task ${newId} assigned to ${assignedName} regarding '${taskTitle}'`
    );

    onAddToast("Task Assigned", `Dispatch checklist item ${newId} successfully queued.`, "success");
    
    // reset form
    setTaskTitle("");
    setTaskDesc("");
    setTaskAssignedId("");
    setTaskPriority("");
    setTaskDueDate("2026-07-15");
    setShowForm(false);
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    if (currentUser.role !== "super_admin" && currentUser.role !== "municipal_admin") {
      onAddToast("Admin Needed", "Only managers or admins can archive dispatch tasks.", "error");
      return;
    }

    const allTasks = getTasks();
    const updated = allTasks.filter(t => t.id !== taskId);
    saveTasks(updated);
    setTasks(updated);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Delete Dispatch Task",
      `Removed task checklist reference ${taskId}`
    );

    onAddToast("Task Removed", `Dispatch task ${taskId} was cleared from active worklists.`, "info");
    setSelectedTaskId(null);
  };

  // Update Progress / Status
  const handleUpdateTaskStatus = (taskId: string, newStatus: Task["status"], percent: number) => {
    const allTasks = getTasks();
    const updated = allTasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: newStatus,
          progressPercentage: percent,
          completionDate: newStatus === "Completed" ? new Date().toISOString() : undefined
        };
      }
      return t;
    });

    saveTasks(updated);
    setTasks(updated);

    onAddToast("Task Updated", `Task progress has been adjusted to ${percent}%.`, "success");
    loadData();
  };

  // Submit commentary
  const handleAddTaskComment = (taskId: string) => {
    if (!newCommentText.trim()) return;

    const allTasks = getTasks();
    const updated = allTasks.map(t => {
      if (t.id === taskId) {
        const comments = t.comments || [];
        const newCom = {
          id: `tcom-${Date.now()}`,
          userName: currentUser.name,
          text: newCommentText.trim(),
          timestamp: new Date().toISOString()
        };
        return {
          ...t,
          comments: [...comments, newCom]
        };
      }
      return t;
    });

    saveTasks(updated);
    setTasks(updated);
    setNewCommentText("");
    onAddToast("Feedback Appended", "Technical diagnostic comments saved to task history.", "success");
    loadData();
  };

  const getPriorityBadge = (p: Task["priority"]) => {
    switch (p) {
      case "Low": return "bg-slate-100 text-slate-700 border-slate-200";
      case "Medium": return "bg-blue-50 text-blue-700 border-blue-200";
      case "High": return "bg-orange-50 text-orange-700 border-orange-200 font-bold";
      case "Critical": return "bg-red-50 text-red-700 border-red-200 font-black animate-pulse";
    }
  };

  const getStatusBadge = (s: Task["status"]) => {
    switch (s) {
      case "Pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "In Progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Cancelled": return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-6">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 space-y-4 sm:space-y-0">
        <div>
          <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center">
            <CheckSquare className="mr-2 text-gov-green" size={18} />
            <span>Technician Field Task Manager</span>
          </h3>
          <p className="text-[10px] text-slate-500">Coordinate engineering tasks, service repair jobs, and quality inspections.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Create Task Button */}
          {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gov-green hover:bg-gov-green-hover text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-gov-green/10"
            >
              <Plus size={12} />
              <span>Assign New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Form panel to register Task */}
      {showForm && (
        <form onSubmit={handleCreateTask} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-3 border-b border-slate-200 pb-2">
            <h4 className="font-black uppercase text-[11px] text-slate-800">Dispatch Task Registration</h4>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Task Summary *</label>
            <input
              type="text"
              placeholder="e.g. Conduct pressure pipe diagnostics"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Assigned Engineer / Technician *</label>
            <select
              value={taskAssignedId}
              onChange={(e) => setTaskAssignedId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
              required
            >
              <option value="">Select technician</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name} - ({t.departmentName})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Target Department *</label>
            <select
              value={taskDeptId}
              onChange={(e) => setTaskDeptId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
            >
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Task Priority Level *</label>
            <select
              required
              value={taskPriority}
              onChange={(e) => setTaskPriority(e.target.value as Task["priority"])}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
            >
              <option value="">Select priority</option>
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Priority</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Target Completion Deadline *</label>
            <input
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-semibold text-slate-700 text-base"
              required
            />
          </div>

          <div className="md:col-span-3 space-y-1.5">
            <label className="font-bold text-slate-700 block">Task Scope Specifications</label>
            <textarea
              placeholder="Detail required diagnostic tests, pipe configurations, materials, safety hazards..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 h-16 focus:outline-none text-base"
            />
          </div>

          <div className="md:col-span-3 flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
            >
              Assign Checklist Task
            </button>
          </div>
        </form>
      )}

      {/* 3. Filtering and search row */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center space-x-1.5">
          <Filter size={14} className="text-gov-blue" />
          <span className="font-bold uppercase tracking-wide text-slate-700 text-[10px]">Filter Dispatch Tasks:</span>
        </div>

        {/* Status filters */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-bold text-slate-700 text-base"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        {/* Priority filters */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-bold text-slate-700 text-base"
        >
          <option value="All">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>

        {/* Staff assignments */}
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none font-bold text-slate-700 text-gov-blue text-base"
        >
          <option value="All">All Technicians</option>
          <option value="me">Assigned To Me</option>
          {technicians.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* 4. Split panel: List vs Selected Task Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Tasks List */}
        <div className="lg:col-span-7 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No matching task checklist assignments found.
            </div>
          ) : (
            filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTaskId(t.id);
                  setTempProgress(t.progressPercentage);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col space-y-3 ${
                  selectedTaskId === t.id 
                    ? "bg-slate-50 border-gov-green shadow-sm" 
                    : "bg-white border-slate-100 hover:bg-slate-50/40"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[9px] font-bold text-gov-blue bg-gov-blue/5 px-1.5 py-0.5 rounded">
                        {t.id}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
                        {t.status}
                      </span>
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{t.title}</h4>
                  </div>
                  <span className="text-[11px] font-black font-mono text-slate-700">{t.progressPercentage}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      t.progressPercentage === 100 
                        ? "bg-emerald-500" 
                        : t.priority === "Critical" 
                        ? "bg-red-500" 
                        : "bg-gov-blue"
                    }`}
                    style={{ width: `${t.progressPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span className="font-sans font-bold text-slate-500">Assignee: {t.assignedUserName}</span>
                  <span>Due: {new Date(t.dueDate).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Selected Task Inspector & Commentary Panel */}
        <div className="lg:col-span-5 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
          {selectedTaskId ? (
            (() => {
              const task = tasks.find(t => t.id === selectedTaskId);
              if (!task) return null;

              return (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="font-black text-slate-900 uppercase">Checking Job {task.id}</h4>
                    {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
                      <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 flex items-center space-x-1"
                      >
                        <Trash2 size={13} />
                        <span>Cancel Task</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-800 uppercase text-[11px]">{task.title}</h5>
                    <p className="text-slate-500 leading-relaxed text-[11px] bg-white p-2.5 rounded-lg border border-slate-100">{task.description || "No specifications detailed."}</p>
                  </div>

                  {/* Technician Progress Adjuster */}
                  <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>Adjust Progress Tracker</span>
                      <span className="font-mono text-gov-blue">{tempProgress}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="5"
                      value={tempProgress}
                      onChange={(e) => setTempProgress(Number(e.target.value))}
                      className="w-full accent-gov-green text-base"
                    />

                    {/* Quick status adjust buttons */}
                    <div className="flex justify-between gap-1 pt-1">
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, "In Progress", tempProgress)}
                        className="flex-grow py-1 bg-gov-blue text-white rounded font-bold text-[9px] uppercase hover:bg-blue-600 transition-all"
                      >
                        Save Progress
                      </button>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, "Completed", 100)}
                        className="flex-grow py-1 bg-emerald-600 text-white rounded font-bold text-[9px] uppercase hover:bg-emerald-700 transition-all flex items-center justify-center space-x-0.5"
                      >
                        <CheckCircle size={10} />
                        <span>Complete (100%)</span>
                      </button>
                    </div>
                  </div>

                  {/* Comments Log */}
                  <div className="space-y-2">
                    <span className="font-black text-slate-500 uppercase text-[9px] block">Technical Site Logs ({task.comments?.length || 0})</span>
                    
                    <div className="space-y-2 max-h-[140px] overflow-y-auto">
                      {!task.comments || task.comments.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic">No diagnostic site logs filed yet.</p>
                      ) : (
                        task.comments.map((com, idx) => (
                          <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px]">
                            <div className="flex justify-between font-bold text-slate-700 mb-1 text-[10px]">
                              <span>{com.userName}</span>
                              <span className="font-mono text-slate-400 text-[8px]">{new Date(com.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-600 leading-normal">{com.text}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Write diagnostic comment */}
                    <div className="flex items-center space-x-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="Add engineering diagnostic or status updates..."
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        className="flex-grow bg-white border border-slate-200 rounded-lg p-2 text-[11px] focus:outline-none text-base"
                      />
                      <button
                        onClick={() => handleAddTaskComment(task.id)}
                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                        title="Add Diagnostic Comment"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Sliders size={28} className="opacity-30 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider text-center">Inspect Dispatch Details</p>
              <p className="text-[10px] mt-1 text-center">Click any active task to inspect specifications, change status, adjust completion ratios, or log diagnostic notes.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
