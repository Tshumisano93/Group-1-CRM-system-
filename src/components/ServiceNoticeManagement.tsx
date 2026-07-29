import React, { useState, useEffect } from "react";
import { getServiceNotices, saveSingleServiceNotice, deleteServiceNotice, getDepartments, getWards } from "../db";
import { ServiceNotice } from "../types";
import { Plus, Trash2, Edit2, AlertTriangle, X, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

export default function ServiceNoticeManagement() {
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<ServiceNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ServiceNotice["category"]>("Water");
  const [status, setStatus] = useState<ServiceNotice["status"]>("Operational");
  const [priority, setPriority] = useState<ServiceNotice["priority"]>("Medium");
  const [department, setDepartment] = useState("");
  const [departmentManager, setDepartmentManager] = useState("T. Nekhavhambe");
  const [emergencyNumber, setEmergencyNumber] = useState("015 962 7500");
  const [email, setEmail] = useState("info@thulamela.gov.za");
  const [officeHours, setOfficeHours] = useState("08:00 - 16:30");
  const [affectedArea, setAffectedArea] = useState("All Wards");
  const [affectedWards, setAffectedWards] = useState<number[]>([]);
  const [cause, setCause] = useState("Scheduled Maintenance");
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState("0");
  const [referenceNumber, setReferenceNumber] = useState("");

  useEffect(() => {
    setNotices(getServiceNotices());
    const handleUpdate = () => setNotices(getServiceNotices());
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  const resetForm = () => {
    setTitle("");
    setCategory("Water");
    setStatus("Operational");
    setPriority("Medium");
    setDepartment("");
    setDepartmentManager("T. Nekhavhambe");
    setEmergencyNumber("015 962 7500");
    setEmail("info@thulamela.gov.za");
    setOfficeHours("08:00 - 16:30");
    setAffectedArea("All Wards");
    setAffectedWards([]);
    setCause("Scheduled Maintenance");
    setDescription("");
    setProgress("0");
    setReferenceNumber("");
    setFormError(null);
    setEditingNotice(null);
  };

  const handleOpenCreateModal = () => {
    resetForm();
    setReferenceNumber(`SN-${Math.floor(100000 + Math.random() * 900000)}`);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (notice: ServiceNotice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setCategory(notice.category);
    setStatus(notice.status);
    setPriority(notice.priority);
    setDepartment(notice.department || "");
    setDepartmentManager(notice.departmentManager || "N/A");
    setEmergencyNumber(notice.emergencyNumber || "015 962 7500");
    setEmail(notice.email || "info@thulamela.gov.za");
    setOfficeHours(notice.officeHours || "08:00 - 16:30");
    setAffectedArea(notice.affectedArea || "All Wards");
    setAffectedWards(notice.affectedWards || []);
    setCause(notice.cause || "Scheduled Maintenance");
    setDescription(notice.description || "");
    setProgress(String(notice.progress || 0));
    setReferenceNumber(notice.referenceNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("Notice Title is required.");
      return;
    }
    if (!description.trim()) {
      setFormError("Detailed Description is required.");
      return;
    }

    setIsSubmitting(true);

    const newNotice: ServiceNotice = {
      id: editingNotice ? editingNotice.id : `notice-${Date.now()}`,
      title: title.trim(),
      category: category,
      status: status,
      priority: priority,
      description: description.trim(),
      cause: cause.trim() || "Maintenance",
      dateReported: editingNotice ? editingNotice.dateReported : new Date().toISOString(),
      estimatedCompletion: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      affectedWards: affectedWards.length > 0 ? affectedWards : [1],
      affectedArea: affectedArea.trim() || "All Wards",
      department: department.trim() || "Technical Services",
      departmentManager: departmentManager.trim() || "N/A",
      emergencyNumber: emergencyNumber.trim() || "015 962 7500",
      email: email.trim() || "info@thulamela.gov.za",
      officeHours: officeHours.trim() || "08:00 - 16:30",
      referenceNumber: referenceNumber.trim() || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
      progress: parseInt(progress, 10) || 0,
      timeline: editingNotice?.timeline || [
        { time: new Date().toISOString(), description: `Notice initialized: ${title.trim()}` }
      ]
    };

    try {
      await saveSingleServiceNotice(newNotice);
      setIsSubmitting(false);
      setIsModalOpen(false);
      resetForm();
      setSuccessToast(editingNotice ? "Service notice updated successfully." : "Service notice created and saved to Firestore.");
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error("Error creating/saving service notice:", err);
      let message = "Failed to save Service Notice. Please check database permissions.";
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) message = `Firestore Error: ${parsed.error}`;
        } catch (_) {
          message = err.message;
        }
      }
      setFormError(message);
      setIsSubmitting(false);
      // DO NOT CLOSE MODAL - keep open so user sees error and retains input
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this Service Notice?")) {
      try {
        await deleteServiceNotice(id);
        setSuccessToast("Service notice deleted.");
        setTimeout(() => setSuccessToast(null), 3000);
      } catch (err: any) {
        alert("Failed to delete notice: " + (err?.message || "Permission error"));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Service Notice Management</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Broadcast real-time municipal operational, maintenance, and emergency updates to citizens.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-gov-green hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all"
        >
          <Plus size={16} />
          <span>Create Service Notice</span>
        </button>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Notices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notices.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-xs">
            No service notices recorded yet. Click "Create Service Notice" to publish a new municipal update.
          </div>
        ) : (
          notices.map((notice) => (
            <div key={notice.id} className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                    notice.status === "Emergency" ? "bg-red-100 text-red-700" :
                    notice.status === "Maintenance" ? "bg-amber-100 text-amber-700" :
                    notice.status === "Scheduled" ? "bg-blue-100 text-blue-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>
                    {notice.status}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {notice.referenceNumber}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug">{notice.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2">{notice.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="space-x-2 font-medium">
                  <span className="font-bold text-slate-700">{notice.category}</span>
                  <span>•</span>
                  <span>Ward {notice.affectedWards?.join(", ") || "All"}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(notice)}
                    className="p-1.5 text-slate-600 hover:text-gov-blue hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Notice"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(notice.id)}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Delete Notice"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fadeIn my-8">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-white">
                  {editingNotice ? "Edit Service Notice" : "Create New Service Notice"}
                </h3>
                <p className="text-xs text-slate-400">
                  Fill in municipal notification details below to broadcast to citizen portal.
                </p>
              </div>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Form Error Banner */}
              {formError && (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-xl text-xs font-bold flex items-start space-x-3 animate-fadeIn">
                  <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <div className="font-extrabold uppercase tracking-wide">Notice Submission Failed</div>
                    <p className="mt-1 font-normal text-red-700 leading-relaxed">{formError}</p>
                  </div>
                </div>
              )}

              {/* Title & Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="font-bold text-slate-700">Notice Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scheduled Water Maintenance in Ward 1 & 2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-gov-blue font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Reference No.</label>
                  <input
                    type="text"
                    readOnly
                    value={referenceNumber}
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl p-2.5 text-slate-600 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Category, Status, Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  >
                    <option value="Water">Water Services</option>
                    <option value="Electricity">Electricity & Energy</option>
                    <option value="Roads">Roads & Transport</option>
                    <option value="Sewer">Sewer & Sanitation</option>
                    <option value="Waste">Waste Management</option>
                    <option value="StreetLights">Street Lighting</option>
                    <option value="StormWater">Stormwater</option>
                    <option value="Parks">Parks & Recreation</option>
                    <option value="Housing">Housing</option>
                    <option value="General">General Notice</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Operational Status *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  >
                    <option value="Operational">Operational</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Emergency">Emergency Shutdown</option>
                    <option value="Scheduled">Scheduled Work</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Priority Level *</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Emergency</option>
                  </select>
                </div>
              </div>

              {/* Department & Manager */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Responsible Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium bg-white"
                  >
                    <option value="" disabled>Select a department</option>
                    {getDepartments().map((dept) => (
                      <option key={dept.id || dept.name} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Department Manager</label>
                  <input
                    type="text"
                    value={departmentManager}
                    onChange={(e) => setDepartmentManager(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Emergency Contact, Email, Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Emergency Contact No.</label>
                  <input
                    type="text"
                    value={emergencyNumber}
                    onChange={(e) => setEmergencyNumber(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Official Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Office Hours</label>
                  <input
                    type="text"
                    value={officeHours}
                    onChange={(e) => setOfficeHours(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Wards & Affected Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700 flex justify-between items-center mb-1">
                    <span>Affected Wards (Select Wards)</span>
                    <span className="text-[10px] text-slate-500 font-normal">{affectedWards.length} selected</span>
                  </label>
                  <div className="border border-slate-300 rounded-xl p-3 max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50/50">
                    {getWards().map((ward) => {
                      const isSelected = affectedWards.includes(ward.wardNumber);
                      return (
                        <label 
                          key={ward.wardNumber}
                          className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50 border-blue-200 text-blue-900 font-bold" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setAffectedWards(affectedWards.filter(w => w !== ward.wardNumber));
                              } else {
                                setAffectedWards([...affectedWards, ward.wardNumber]);
                              }
                            }}
                            className="rounded border-slate-300 text-gov-blue focus:ring-gov-blue"
                          />
                          <span className="truncate">Ward {ward.wardNumber} - {ward.wardName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-slate-700">Affected Area Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Thohoyandou Block F & Central"
                    value={affectedArea}
                    onChange={(e) => setAffectedArea(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Cause & Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Cause / Maintenance Reason</label>
                <input
                  type="text"
                  placeholder="e.g. Main pipeline burst repair"
                  value={cause}
                  onChange={(e) => setCause(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete public details regarding the service impact, work timelines, and safety guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium leading-relaxed"
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gov-blue hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <span>{editingNotice ? "Update Service Notice" : "Publish Service Notice"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

