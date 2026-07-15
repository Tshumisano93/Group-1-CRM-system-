import React, { useState, useEffect } from "react";
import { Search, ChevronRight, User, Phone, Mail, MapPin } from "lucide-react";
import { getWards, getUsers, getComplaints } from "../db";
import { Ward, User as UserType, Complaint } from "../types";

export default function PublicWards() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wardSearch, setWardSearch] = useState("");
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);

  useEffect(() => {
    setWards(getWards());
    setUsers(getUsers());
    setComplaints(getComplaints());
  }, []);

  const calculateWardComplaints = (wardNum: number) => {
    const wardComplaints = complaints.filter(c => c.wardNumber === wardNum);
    return {
      count: wardComplaints.length,
      resolved: wardComplaints.filter(c => c.status === "Resolved" || c.status === "Closed").length,
      pending: wardComplaints.filter(c => c.status === "Pending" || c.status === "In Progress").length
    };
  };

  const filteredWards = wards.filter(w => {
    return w.wardName.toLowerCase().includes(wardSearch.toLowerCase()) ||
           w.wardNumber.toString() === wardSearch;
  });

  if (selectedWard) {
    const { count, resolved, pending } = calculateWardComplaints(selectedWard.wardNumber);
    const councillor = users.find(u => u.id === selectedWard.assignedCouncillorId);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <button onClick={() => setSelectedWard(null)} className="text-gov-blue font-bold text-xs flex items-center">
          <ChevronRight className="rotate-180" size={16} /> Back to All Wards
        </button>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 uppercase">Ward {selectedWard.wardNumber} - {selectedWard.wardName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-slate-900 mb-2">Councillor Information</h4>
                {councillor ? (
                  <div className="flex items-center space-x-3">
                    <img src={councillor.profilePicture} alt={councillor.name} className="w-12 h-12 rounded-full" />
                    <div>
                      <p className="font-bold">{councillor.name}</p>
                      <p className="text-slate-500 text-xs">{councillor.politicalPosition}</p>
                      <p className="text-slate-500 text-xs">{councillor.email}</p>
                    </div>
                  </div>
                ) : <p className="text-xs text-red-500">No councillor assigned.</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-100 p-3 rounded-lg text-center"><p className="text-xs text-slate-500">Submitted</p><p className="font-black text-slate-900">{count}</p></div>
                <div className="bg-emerald-100 p-3 rounded-lg text-center"><p className="text-xs text-emerald-800">Resolved</p><p className="font-black text-emerald-900">{resolved}</p></div>
                <div className="bg-amber-100 p-3 rounded-lg text-center"><p className="text-xs text-amber-800">Pending</p><p className="font-black text-amber-900">{pending}</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-900 uppercase">Municipal Wards</h2>
        <div className="relative w-72 text-xs">
          <input type="text" placeholder="Search by Ward..." value={wardSearch} onChange={(e) => setWardSearch(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-8 pr-4 text-base" />
          <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWards.map(w => (
          <div key={w.wardNumber} onClick={() => setSelectedWard(w)} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-black text-gov-blue">Ward {w.wardNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${w.assignedCouncillorId ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                {w.assignedCouncillorId ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            <p className="font-bold text-slate-900">{w.wardName}</p>
            {w.councillorName && <p className="text-xs text-slate-600">Councillor: {w.councillorName}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
