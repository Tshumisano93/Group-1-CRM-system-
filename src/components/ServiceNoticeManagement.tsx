import React, { useState, useEffect } from "react";
import { getServiceNotices, saveServiceNotices } from "../db";
import { ServiceNotice } from "../types";
import { Plus, Trash2, Edit2, CheckCircle, Save } from "lucide-react";

export default function ServiceNoticeManagement() {
  const [notices, setNotices] = useState<ServiceNotice[]>([]);

  useEffect(() => {
    setNotices(getServiceNotices());
    const handleUpdate = () => setNotices(getServiceNotices());
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  const addNotice = () => {
    const newNotice: ServiceNotice = {
      id: `notice-${Date.now()}`,
      title: "New Service Notice",
      category: "General",
      status: "Operational",
      description: "Description",
      cause: "None",
      dateReported: new Date().toISOString(),
      estimatedCompletion: new Date().toISOString(),
      priority: "Low",
      affectedWards: [],
      affectedArea: "All",
      department: "General",
      departmentManager: "N/A",
      emergencyNumber: "015-000-0000",
      email: "info@thulamela.gov.za",
      officeHours: "08:00 - 16:30",
      referenceNumber: `REF-${Date.now()}`,
      progress: 0,
      timeline: []
    };
    saveServiceNotices([...notices, newNotice]);
  };

  const deleteNotice = (id: string) => {
    saveServiceNotices(notices.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Service Notice Management</h2>
        <button onClick={addNotice} className="bg-gov-green text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center space-x-2">
          <Plus size={16} /> <span>Add New Notice</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {notices.map(notice => (
          <div key={notice.id} className="bg-white p-4 border rounded-lg shadow-sm flex justify-between items-center">
            <div>
              <h3 className="font-bold">{notice.title}</h3>
              <p className="text-xs text-slate-500">{notice.category} - {notice.status}</p>
            </div>
            <div className="flex space-x-2">
              <button className="text-blue-500"><Edit2 size={16} /></button>
              <button onClick={() => deleteNotice(notice.id)} className="text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
