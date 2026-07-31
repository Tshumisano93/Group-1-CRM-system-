import React, { useState, useEffect } from "react";
import { 
  getWards, 
  getComplaints, 
  getTechnicians, 
  getServiceNotices, 
  getDigitalForms,
  getWardStatsMap 
} from "../db";
import { Ward, Complaint, Technician, ServiceNotice, DigitalForm, User } from "../types";
import { 
  Map as MapIcon, 
  Layers, 
  Search, 
  Filter, 
  Compass, 
  Info, 
  Activity, 
  ChevronRight, 
  Radio, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  User as UserIcon,
  PhoneCall,
  MapPin,
  Building2,
  FileText,
  Wrench
} from "lucide-react";
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

interface SharedGISMapProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type MapLayer = "blueprint" | "satellite" | "heatmap";
type RecordTypeFilter = "all" | "complaints" | "notices" | "forms" | "technicians";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

export default function SharedGISMap({ currentUser, onAddToast }: SharedGISMapProps) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [serviceNotices, setServiceNotices] = useState<ServiceNotice[]>([]);
  const [digitalForms, setDigitalForms] = useState<DigitalForm[]>([]);

  // Filters
  const [selectedWardNumber, setSelectedWardNumber] = useState<number | null>(
    currentUser.role === "councillor" ? (currentUser.wardNumber || 1) : null
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(
    currentUser.role === "sub_admin" ? (currentUser.departmentId || "") : "All"
  );
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [recordTypeFilter, setRecordTypeFilter] = useState<RecordTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLayer, setActiveLayer] = useState<MapLayer>("blueprint");
  const [selectedItem, setSelectedItem] = useState<{ type: string; data: any } | null>(null);

  const loadData = () => {
    setWards(getWards());
    setComplaints(getComplaints());
    setTechnicians(getTechnicians());
    setServiceNotices(getServiceNotices());
    setDigitalForms(getDigitalForms());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("thulamela_db_update", loadData);
    return () => window.removeEventListener("thulamela_db_update", loadData);
  }, []);

  // Enforce Role-Based Scoping
  const role = currentUser.role;
  const userWard = currentUser.wardNumber;
  const userDept = currentUser.departmentId;
  const userId = currentUser.id;

  // Scoped Complaints
  let scopedComplaints = complaints;
  if (role === "councillor") {
    scopedComplaints = complaints.filter(c => c.wardNumber === userWard);
  } else if (role === "sub_admin") {
    scopedComplaints = complaints.filter(c => c.departmentId === userDept);
  } else if (role === "technician") {
    scopedComplaints = complaints.filter(c => c.assignedTechnicianId === userId || c.departmentId === userDept);
  }

  // Apply filters on complaints
  const filteredComplaints = scopedComplaints.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.streetAddress && c.streetAddress.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesPriority = priorityFilter === "All" || c.priority === priorityFilter;
    const matchesWard = selectedWardNumber === null || c.wardNumber === selectedWardNumber;
    const matchesDept = selectedDepartmentId === "All" || !selectedDepartmentId || c.departmentId === selectedDepartmentId;

    return matchesSearch && matchesStatus && matchesPriority && matchesWard && matchesDept;
  });

  // Scoped Service Notices
  let scopedNotices = serviceNotices;
  if (role === "councillor" && userWard) {
    scopedNotices = serviceNotices.filter(n => n.affectedWards && n.affectedWards.includes(userWard));
  } else if (role === "sub_admin" && userDept) {
    scopedNotices = serviceNotices.filter(n => n.department === userDept || n.department === "Technical Services");
  }

  const filteredNotices = scopedNotices.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.affectedArea.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWard = selectedWardNumber === null || (n.affectedWards && n.affectedWards.includes(selectedWardNumber));
    return matchesSearch && matchesWard;
  });

  // Scoped Technicians / Jobs
  let scopedTechnicians = technicians;
  if (role === "sub_admin" && userDept) {
    scopedTechnicians = technicians.filter(t => t.departmentId === userDept);
  } else if (role === "technician") {
    scopedTechnicians = technicians.filter(t => t.id === userId);
  }

  // Scoped Wards
  let scopedWards = wards;
  if (role === "councillor" && userWard) {
    scopedWards = wards.filter(w => w.wardNumber === userWard);
  } else if (role === "sub_admin" && userDept) {
    // Show wards related to department complaints
    const deptWardNums = new Set(scopedComplaints.map(c => c.wardNumber));
    scopedWards = wards.filter(w => deptWardNums.has(w.wardNumber));
    if (scopedWards.length === 0) scopedWards = wards.slice(0, 10); // fallback
  }

  const statsMap = getWardStatsMap();

  // Grid coordinates for SVG fallback
  const gridWards = scopedWards.map((w, i) => {
    const num = w.wardNumber;
    const row = Math.floor(i / 7);
    const col = i % 7;
    const x = 50 + col * 75;
    const y = 50 + row * 65;
    const stats = statsMap[num] || { count: 0, resolved: 0, pending: 0 };
    const total = stats.count;
    let computedPerf = w.performancePercentage || 85;
    if (total > 0) {
      computedPerf = Math.round((stats.resolved / total) * 100);
    }
    return {
      ...w,
      stats,
      performance: computedPerf,
      x,
      y
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col lg:flex-row h-[700px]">
      
      {/* LEFT SIDEBAR: CONTROLS, WARD LIST & SCOPE INFO */}
      <div className="w-full lg:w-90 border-r border-slate-100 flex flex-col bg-slate-50/60">
        
        {/* Header & Role Scope Badge */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-xs text-slate-900 uppercase tracking-widest flex items-center">
              <Compass className="mr-1.5 text-gov-green animate-spin" size={15} />
              <span>Unified GIS Map</span>
            </h3>
            <span className="text-[9px] bg-gov-blue/15 text-gov-blue px-2 py-0.5 rounded font-black uppercase font-mono">
              Scope: {role === "super_admin" ? "Municipality-Wide" : role === "municipal_admin" ? "Operations" : role === "sub_admin" ? `Dept: ${userDept}` : role === "technician" ? "Assigned Work" : `Ward ${userWard}`}
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search locations, cases, notices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-gov-green focus:bg-white transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          </div>

          {/* Role-Based Scoped Filters */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Ward Selector (Locked for Councillor) */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Ward Filter</label>
              <select
                disabled={role === "councillor"}
                value={selectedWardNumber !== null ? selectedWardNumber : "All"}
                onChange={(e) => setSelectedWardNumber(e.target.value === "All" ? null : Number(e.target.value))}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold ${role === "councillor" ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}`}
              >
                {role !== "councillor" && <option value="All">Select Ward...</option>}
                {wards.map(w => (
                  <option key={w.wardNumber} value={w.wardNumber}>Ward {w.wardNumber}: {w.wardName}</option>
                ))}
              </select>
            </div>

            {/* Department Selector (Locked for Sub-Admin) */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-500 uppercase font-mono">Department</label>
              <select
                disabled={role === "sub_admin"}
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-bold ${role === "sub_admin" ? "bg-slate-100 cursor-not-allowed text-slate-500" : ""}`}
              >
                <option value="All">Select Department...</option>
                <option value="WATER">Water Services</option>
                <option value="ELEC">Electricity & Energy</option>
                <option value="ROADS">Roads & Stormwater</option>
                <option value="WASTE">Solid Waste</option>
                <option value="COMMUNITY">Community Services</option>
              </select>
            </div>
          </div>

          {/* Record Type Filter */}
          <div className="grid grid-cols-5 gap-1 text-[8px] font-black uppercase text-center pt-1">
            <button
              onClick={() => setRecordTypeFilter("all")}
              className={`py-1 rounded border transition-all ${recordTypeFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              All
            </button>
            <button
              onClick={() => setRecordTypeFilter("complaints")}
              className={`py-1 rounded border transition-all ${recordTypeFilter === "complaints" ? "bg-gov-blue text-white border-gov-blue" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              Complaints ({filteredComplaints.length})
            </button>
            <button
              onClick={() => setRecordTypeFilter("notices")}
              className={`py-1 rounded border transition-all ${recordTypeFilter === "notices" ? "bg-amber-500 text-white border-amber-500" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              Notices ({filteredNotices.length})
            </button>
            <button
              onClick={() => setRecordTypeFilter("forms")}
              className={`py-1 rounded border transition-all ${recordTypeFilter === "forms" ? "bg-gov-green text-white border-gov-green" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              Forms
            </button>
            <button
              onClick={() => setRecordTypeFilter("technicians")}
              className={`py-1 rounded border transition-all ${recordTypeFilter === "technicians" ? "bg-purple-600 text-white border-purple-600" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* List of Scoped Items / Wards */}
        <div className="flex-grow overflow-y-auto p-2 space-y-2 text-xs">
          <div className="text-[9px] font-black uppercase text-slate-400 px-2 font-mono">
            Scoped Operational Records ({filteredComplaints.length} Complaints, {filteredNotices.length} Notices)
          </div>

          {/* Complaints list */}
          {(recordTypeFilter === "all" || recordTypeFilter === "complaints") && filteredComplaints.map(c => (
            <div
              key={c.id}
              onClick={() => setSelectedItem({ type: "complaint", data: c })}
              className="bg-white p-3 rounded-xl border border-slate-100 hover:border-gov-blue cursor-pointer transition-all shadow-sm space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{c.id}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                  c.status === "Resolved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}>
                  {c.status}
                </span>
              </div>
              <h4 className="font-bold text-slate-900 truncate">{c.title}</h4>
              <p className="text-[10px] text-slate-500">Ward {c.wardNumber} - {c.category}</p>
            </div>
          ))}

          {/* Service notices list */}
          {(recordTypeFilter === "all" || recordTypeFilter === "notices") && filteredNotices.map(n => (
            <div
              key={n.id}
              onClick={() => setSelectedItem({ type: "notice", data: n })}
              className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/60 hover:border-amber-400 cursor-pointer transition-all shadow-sm space-y-1"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">{n.referenceNumber}</span>
                <span className="text-[9px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">{n.category}</span>
              </div>
              <h4 className="font-bold text-amber-950 truncate">{n.title}</h4>
              <p className="text-[10px] text-amber-800">Area: {n.affectedArea}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT STAGE: MAP RENDERER (GOOGLE MAPS OR SVG FALLBACK) */}
      <div className="flex-grow flex flex-col bg-slate-900 relative">
        
        {/* Layer Controls Top bar */}
        <div className="absolute top-4 left-4 z-10 flex items-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-sm space-x-1 text-[9px] font-black uppercase text-white">
          <Layers className="text-gov-yellow mr-1" size={12} />
          <button
            onClick={() => setActiveLayer("blueprint")}
            className={`px-2 py-1 rounded transition-colors ${activeLayer === "blueprint" ? "bg-gov-blue text-white" : "text-slate-400 hover:text-white"}`}
          >
            Technical Blueprint
          </button>
          <button
            onClick={() => setActiveLayer("satellite")}
            className={`px-2 py-1 rounded transition-colors ${activeLayer === "satellite" ? "bg-gov-blue text-white" : "text-slate-400 hover:text-white"}`}
          >
            Satellite View
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-grow relative overflow-hidden flex items-center justify-center">
          {hasValidKey ? (
            <APIProvider apiKey={API_KEY}>
              <GoogleMap
                defaultCenter={{ lat: -22.9567, lng: 30.4812 }}
                defaultZoom={11}
                mapId="thulamela_gis_map"
                className="w-full h-full"
              >
                {filteredComplaints.map(c => {
                  const [latStr, lngStr] = (c.gpsCoordinates || "-22.9567, 30.4812").split(",");
                  const lat = parseFloat(latStr) || -22.9567;
                  const lng = parseFloat(lngStr) || 30.4812;
                  return (
                    <AdvancedMarker
                      key={c.id}
                      position={{ lat, lng }}
                      onClick={() => setSelectedItem({ type: "complaint", data: c })}
                    >
                      <Pin background="#16a34a" borderColor="#15803d" glyphColor="#ffffff" />
                    </AdvancedMarker>
                  );
                })}
              </GoogleMap>
            </APIProvider>
          ) : (
            // SVG Interactive Fallback Map (Fully styled Thulamela Blueprint GIS)
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden p-6">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]"></div>
              
              <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-800 p-3 rounded-xl text-slate-300 text-[10px] font-mono space-y-1 shadow-lg">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-white uppercase">GIS Fallback Engine Active</span>
                </div>
                <p className="text-slate-400">Rendering {gridWards.length} Wards & {filteredComplaints.length} Dockets</p>
              </div>

              {/* SVG Canvas representing Wards and Markers */}
              <div className="w-full h-full flex flex-wrap items-center justify-center gap-3 p-6 overflow-auto">
                {gridWards.map(w => (
                  <div
                    key={w.wardNumber}
                    onClick={() => setSelectedWardNumber(w.wardNumber)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col items-center justify-center min-w-[120px] ${
                      selectedWardNumber === w.wardNumber 
                        ? "bg-gov-blue/20 border-gov-blue text-white shadow-lg scale-105" 
                        : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold text-gov-yellow">Ward {w.wardNumber}</span>
                    <span className="text-xs font-black truncate max-w-[110px] text-center">{w.wardName}</span>
                    <span className="text-[9px] text-slate-400 mt-1">{w.stats.count} cases ({w.performance}% idx)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Selected Item Information Card Modal / Drawer Overlay */}
        {selectedItem && (
          <div className="absolute bottom-4 right-4 left-4 lg:left-auto lg:w-96 bg-slate-950/95 border border-slate-800 p-5 rounded-2xl shadow-2xl backdrop-blur-md text-white z-20 space-y-3 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[9px] text-gov-yellow bg-slate-900 px-2 py-0.5 rounded uppercase font-bold">
                  {selectedItem.type === "complaint" ? selectedItem.data.id : selectedItem.data.referenceNumber}
                </span>
                <h4 className="text-sm font-black mt-1">{selectedItem.type === "complaint" ? selectedItem.data.title : selectedItem.data.title}</h4>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-3 rounded-xl font-mono border border-slate-800">
              {selectedItem.type === "complaint" ? (
                <>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Category</span>{selectedItem.data.category}</div>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Status</span>{selectedItem.data.status}</div>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Priority</span>{selectedItem.data.priority}</div>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Ward</span>Ward {selectedItem.data.wardNumber}</div>
                </>
              ) : (
                <>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Category</span>{selectedItem.data.category}</div>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Status</span>{selectedItem.data.status}</div>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Department</span>{selectedItem.data.department}</div>
                  <div><span className="text-slate-500 block text-[9px] uppercase">Area</span>{selectedItem.data.affectedArea}</div>
                </>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
              {selectedItem.data.description}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
