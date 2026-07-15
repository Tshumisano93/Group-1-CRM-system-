import React, { useState, useEffect, useMemo } from "react";
import { Search, Info, SlidersHorizontal, Grid, X, Check, ArrowRight } from "lucide-react";
import { getComplaints, getServiceNotices } from "../db";
import { Complaint, ServiceNotice } from "../types";
import ServiceResultCard from "./ServiceResultCard";
import ServiceFilters from "./ServiceFilters";

interface ServiceSearchProps {
  onSearchActive?: (isActive: boolean) => void;
}

export default function ServiceSearch({ onSearchActive }: ServiceSearchProps = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<any>({ ward: "", status: "" });
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  // Sync state with database in real-time
  useEffect(() => {
    setComplaints(getComplaints());
    setNotices(getServiceNotices());

    const handleUpdate = () => {
      setComplaints(getComplaints());
      setNotices(getServiceNotices());
    };

    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  // Sync search active state with parent component
  useEffect(() => {
    if (onSearchActive) {
      onSearchActive(searchQuery.trim() !== "");
    }
  }, [searchQuery, onSearchActive]);
  
  // Popular search categories
  const popularServices = [
    { label: "💧 Water", query: "Water" },
    { label: "⚡ Electricity", query: "Electricity" },
    { label: "🛣️ Roads", query: "Roads" },
    { label: "🚽 Sewer", query: "Sewer" },
    { label: "🗑️ Waste", query: "Waste" },
    { label: "💡 Street Lights", query: "StreetLights" }
  ];

  // Auto-suggestions list based on active data
  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    const categories = new Set<string>();
    const areas = new Set<string>();
    const wards = new Set<string>();

    complaints.forEach(c => {
      if (c.category) categories.add(c.category);
      if (c.village) areas.add(c.village);
      if (c.area) areas.add(c.area);
      if (c.wardName) wards.add(c.wardName);
    });

    notices.forEach(n => {
      if (n.category) categories.add(n.category);
      if (n.affectedArea) areas.add(n.affectedArea);
    });

    const combined = [...categories, ...areas, ...wards];
    const search = searchQuery.toLowerCase().trim();
    return combined
      .filter(item => item.toLowerCase().includes(search) && item.toLowerCase() !== search)
      .slice(0, 5);
  }, [complaints, notices, searchQuery]);
  
  // Combine all notices and complaints for unified search results
  const allRecords = useMemo(() => [
    ...notices.map(n => ({ ...n, type: 'notice' as const })),
    ...complaints.map(c => ({ ...c, type: 'complaint' as const }))
  ], [complaints, notices]);

  // Comprehensive searching and filtering logic
  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      const search = searchQuery.trim().toLowerCase();
      
      // If search query is present, check all fields
      const matchesSearch = !search || (
        (r.title && r.title.toLowerCase().includes(search)) ||
        (r.description && r.description.toLowerCase().includes(search)) ||
        ('id' in r && r.id.toLowerCase().includes(search)) ||
        (r.category && r.category.toLowerCase().includes(search)) ||
        ('affectedArea' in r && r.affectedArea && r.affectedArea.toLowerCase().includes(search)) ||
        ('streetLocation' in r && r.streetLocation && r.streetLocation.toLowerCase().includes(search)) ||
        ('department' in r && r.department && r.department.toLowerCase().includes(search)) ||
        ('assignedTechnician' in r && r.assignedTechnician && r.assignedTechnician.toLowerCase().includes(search)) ||
        ('assignedTechnicianName' in r && r.assignedTechnicianName && r.assignedTechnicianName.toLowerCase().includes(search)) ||
        ('affectedWards' in r && r.affectedWards && r.affectedWards.some(w => String(w) === search)) ||
        ('wardNumber' in r && String(r.wardNumber) === search) ||
        ('wardName' in r && r.wardName && r.wardName.toLowerCase().includes(search)) ||
        ('village' in r && r.village && r.village.toLowerCase().includes(search)) ||
        ('area' in r && r.area && r.area.toLowerCase().includes(search))
      );
      
      // Filter matching
      const rWard = 'wardNumber' in r ? r.wardNumber : undefined;
      const rWards = 'affectedWards' in r ? r.affectedWards : undefined;
      const matchesWard = !filters.ward || (
        (rWard !== undefined && rWard === Number(filters.ward)) ||
        (rWards !== undefined && rWards.includes(Number(filters.ward)))
      );

      const matchesStatus = !filters.status || (
        r.status && r.status.toLowerCase() === filters.status.toLowerCase()
      );

      return matchesSearch && matchesWard && matchesStatus;
    }).sort((a, b) => {
      const priorityWeight = (p?: string) => {
        if (!p) return 0;
        const pl = p.toLowerCase();
        if (pl === "critical" || pl === "emergency" || pl === "severe") return 4;
        if (pl === "high") return 3;
        if (pl === "medium") return 2;
        if (pl === "low") return 1;
        return 0;
      };

      // CRITICAL DIRECTIVE: When there are multiple results for a search,
      // order of priority must be Critical -> High -> Medium -> Low.
      const usePrioritySort = searchQuery.trim() !== "";

      if (usePrioritySort) {
        const pDiff = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (pDiff !== 0) return pDiff;
      }

      // Default sort fallbacks
      const aDate = new Date(a.dateCreated || a.dateReported || 0).getTime();
      const bDate = new Date(b.dateCreated || b.dateReported || 0).getTime();
      
      if (sort === "newest") return bDate - aDate;
      if (sort === "oldest") return aDate - bDate;
      if (sort === "priority") {
        return priorityWeight(b.priority) - priorityWeight(a.priority);
      }
      return 0;
    });
  }, [allRecords, searchQuery, filters, sort]);

  // Suggested services mapping
  const handleSuggestedClick = (term: string) => {
    setSearchQuery(term);
    setFilters({ ward: "", status: "" });
  };

  return (
    <div className="space-y-6">
      {/* Search Input Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">
            Real-Time Maintenance Notice Finder
          </h3>
          <p className="text-xs text-slate-500">
            Type your Village, Ward (1-41), Department, or Service Type (Water, Electricity, Roads, Sewer, Waste, Street Lights) below to query active works.
          </p>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by Ward, Village, Street, service category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-12 pr-10 focus:outline-none focus:border-gov-green focus:bg-white shadow-sm font-semibold text-slate-800 transition-all placeholder:text-slate-400 text-base"
          />
          <Search className="absolute left-4 top-4.5 text-slate-400" size={20} />
          
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-4 top-4.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          )}

          {/* Auto Suggestions dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border border-slate-200 rounded-2xl mt-1.5 shadow-xl divide-y divide-slate-100 overflow-hidden">
              {suggestions.map((s, i) => (
                <li 
                  key={i} 
                  onClick={() => setSearchQuery(s)} 
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-700 flex items-center justify-between"
                >
                  <span>{s}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Refine Search</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Click Filter Tags */}
        <div className="space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Quick Filters</p>
          <div className="flex flex-wrap gap-2">
            {popularServices.map((srv, idx) => (
              <button
                key={idx}
                onClick={() => setSearchQuery(srv.query)}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all flex items-center space-x-1 ${
                  searchQuery.toLowerCase() === srv.query.toLowerCase()
                    ? "bg-gov-green text-white border-gov-green shadow-xs shadow-green-100 scale-95"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span>{srv.label}</span>
                {searchQuery.toLowerCase() === srv.query.toLowerCase() && <Check size={12} className="ml-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Toggle Button */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-xs font-extrabold text-slate-600 hover:text-gov-green transition-colors"
          >
            <SlidersHorizontal size={14} />
            <span>{showFilters ? "Hide Advanced Filters" : "Show Advanced Filters"}</span>
          </button>
          <span className="text-[10px] font-mono text-slate-400">
            Loaded {allRecords.length} records in real-time
          </span>
        </div>

        {/* Filters Drawer */}
        {showFilters && (
          <div className="pt-3 border-t border-slate-100">
            <ServiceFilters 
              onFilterChange={(f) => setFilters((prev: any) => ({ ...prev, ...f }))} 
              onSortChange={setSort} 
            />
          </div>
        )}
      </div>

      {/* Results Feed Container */}
      {searchQuery.trim() !== "" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h4 className="font-extrabold text-xs uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Grid size={14} />
              {`Search Results for "${searchQuery}" (${filteredRecords.length} found)`}
            </h4>
            <button 
              onClick={() => setSearchQuery("")}
              className="text-xs text-gov-blue hover:underline font-bold"
            >
              Clear Search
            </button>
          </div>

          {filteredRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecords.map((r) => (
                <ServiceResultCard key={r.id} record={r as any} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-sm">
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 text-rose-500">
                <Info size={24} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base mb-2">
                No active maintenance or service notices found.
              </h3>
              <p className="text-slate-500 text-xs leading-relaxed mb-6">
                There are no current maintenance notices or reported cases for "{searchQuery}" matching your active filters.
              </p>
              
              <div className="border-t border-slate-100 pt-6">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-left">
                  Suggested Related Services & Maintenance
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  <button 
                    onClick={() => handleSuggestedClick("Water")}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 text-xs font-bold text-slate-700 transition-all"
                  >
                    <span className="flex items-center gap-2">💧 Water & Valve Repairs</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </button>
                  <button 
                    onClick={() => handleSuggestedClick("Electricity")}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 text-xs font-bold text-slate-700 transition-all"
                  >
                    <span className="flex items-center gap-2">⚡ Substation Grid Maintenance</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </button>
                  <button 
                    onClick={() => handleSuggestedClick("Roads")}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 text-xs font-bold text-slate-700 transition-all"
                  >
                    <span className="flex items-center gap-2">🛣️ Arterial Pothole Patching</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </button>
                  <button 
                    onClick={() => handleSuggestedClick("Sewer")}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 text-xs font-bold text-slate-700 transition-all"
                  >
                    <span className="flex items-center gap-2">🚽 Sewer Jetting Operations</span>
                    <ArrowRight size={12} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => { setSearchQuery(""); setFilters({ ward: "", status: "" }); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors"
                >
                  Reset Search Filters
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
