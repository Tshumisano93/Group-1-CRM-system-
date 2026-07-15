import React, { useState, useEffect } from "react";
import { Search, AlertTriangle, ChevronRight } from "lucide-react";
import { getServiceNotices } from "../db";
import { ServiceNotice } from "../types";

interface PublicNoticeFeedProps {
  searchQuery?: string;
}

export default function PublicNoticeFeed({ searchQuery = "" }: PublicNoticeFeedProps) {
  const [notices, setNotices] = useState<ServiceNotice[]>([]);

  useEffect(() => {
    setNotices(getServiceNotices());
    const handleUpdate = () => setNotices(getServiceNotices());
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!searchQuery) return null;

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Search Results
            </h2>
        </div>

        {filteredNotices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotices.map((n) => (
                <div key={n.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col space-y-3 hover:border-gov-green/30 transition-all">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 text-sm uppercase">{n.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                    n.status === 'Operational' ? 'bg-green-100 text-green-700' :
                    n.status === 'Maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    n.status === 'Emergency' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                    }`}>{n.status}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{n.description}</p>
                <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-100">
                    <p>Department: {n.department}</p>
                    <p>Progress: {n.progress}%</p>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-gov-green h-1.5 rounded-full" style={{ width: `${n.progress}%` }}></div>
                </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center">
                <p className="text-slate-500 text-sm mb-4">No matching municipal service notices were found.</p>
                <button 
                    onClick={() => window.location.hash = "#contact"}
                    className="bg-gov-blue text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gov-blue-hover"
                >
                    Report New Issue
                </button>
            </div>
        )}
    </div>
  );
}
