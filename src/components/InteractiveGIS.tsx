import React, { useState, useEffect } from "react";
import { 
  getWards, 
  getComplaints, 
  getTechnicians,
  getWardStatsMap 
} from "../db";
import { Ward, Complaint, Technician, User } from "../types";
import { 
  Map, 
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
  PhoneCall
} from "lucide-react";

interface InteractiveGISProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

type MapLayer = "blueprint" | "satellite" | "heatmap";

export default function InteractiveGIS({ currentUser, onAddToast }: InteractiveGISProps) {
  const [wards, setWards] = useState<Ward[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedWardNumber, setSelectedWardNumber] = useState<number | null>(15); // Default to Ward 15 (Makwarela)
  const [activeLayer, setActiveLayer] = useState<MapLayer>("blueprint");
  const [searchQuery, setSearchQuery] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState<"all" | "high" | "warning" | "critical">("all");

  const loadData = () => {
    setWards(getWards());
    setComplaints(getComplaints());
    setTechnicians(getTechnicians());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("thulamela_db_update", loadData);
    return () => window.removeEventListener("thulamela_db_update", loadData);
  }, []);

  // Calculate stats per ward from actual complaints dynamically
  const statsMap = getWardStatsMap();

  // Get color by performance percentage
  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600";
    if (percentage >= 60) return "bg-blue-500 text-white border-blue-600 hover:bg-blue-600";
    if (percentage >= 40) return "bg-amber-500 text-white border-amber-600 hover:bg-amber-600";
    return "bg-red-500 text-white border-red-600 hover:bg-red-600 animate-pulse";
  };

  const getPerformanceFill = (percentage: number) => {
    if (percentage >= 80) return "#10b981"; // Emerald
    if (percentage >= 60) return "#3b82f6"; // Blue
    if (percentage >= 40) return "#f59e0b"; // Amber
    return "#ef4444"; // Red
  };

  // Mock geographical coordinates for Thulamela wards to render SVG positions
  // Represent 41 wards in a beautiful layout
  const gridWards = Array.from({ length: 41 }, (_, i) => {
    const num = i + 1;
    const row = Math.floor(i / 7);
    const col = i % 7;
    const x = 40 + col * 75;
    const y = 40 + row * 65;
    const matchedWard = wards.find(w => w.wardNumber === num);
    const stats = statsMap[num] || { count: 0, resolved: 0, pending: 0 };
    
    // Dynamic calculation of performance based on complaints: (resolved / total)
    const total = stats.count;
    let computedPerf = matchedWard?.performancePercentage || 85;
    if (total > 0) {
      computedPerf = Math.round((stats.resolved / total) * 100);
    }

    return {
      wardNumber: num,
      wardName: matchedWard?.wardName || `Ward Area ${num}`,
      councillor: matchedWard?.councillorName || "Vacant",
      performance: computedPerf,
      stats,
      x,
      y
    };
  });

  // Filtered Wards for sidebar
  const filteredWards = gridWards.filter(w => {
    const matchesSearch = w.wardName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          w.wardNumber.toString() === searchQuery ||
                          w.councillor.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (performanceFilter === "all") return matchesSearch;
    if (performanceFilter === "high") return matchesSearch && w.performance >= 80;
    if (performanceFilter === "warning") return matchesSearch && w.performance >= 45 && w.performance < 80;
    if (performanceFilter === "critical") return matchesSearch && w.performance < 45;
    return matchesSearch;
  });

  const selectedWardInfo = gridWards.find(w => w.wardNumber === selectedWardNumber) || gridWards[14];

  // Mock Technician GPS Tracking Points
  const mockGpsTechnicians = [
    { id: "TECH-201", name: "Vhonani Mapholi", dept: "Water Services", lat: "-22.9567", lng: "30.4812", status: "Active (Repairing Burst)", task: "Pipe Burst Leakage at Makwarela F" },
    { id: "TECH-202", name: "Lufuno Singo", dept: "Electricity", lat: "-22.9431", lng: "30.4725", status: "Active (Transformer Diagnosis)", task: "Power Fault Sibasa Substation" },
    { id: "TECH-203", name: "Tsiko Nedzamba", dept: "Roads", lat: "-22.9712", lng: "30.4908", status: "Standby", task: "Re-grading scheduled at Block G" }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden flex flex-col lg:flex-row h-[650px]">
      
      {/* 1. Left Side Control: List of all 41 Wards */}
      <div className="w-full lg:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        
        {/* Search and Category Control */}
        <div className="p-4 bg-white border-b border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-xs text-slate-800 uppercase tracking-widest flex items-center">
              <Compass className="mr-1.5 text-gov-green animate-spin" size={15} />
              <span>GIS Ward Inspector</span>
            </h3>
            <span className="text-[10px] bg-gov-blue/15 text-gov-blue px-2 py-0.5 rounded font-black uppercase font-mono">
              Thulamela GIS
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search 41 Wards, communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-gov-green focus:bg-white transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
          </div>

          {/* Performance filters */}
          <div className="grid grid-cols-4 gap-1 text-[8px] font-black uppercase text-center">
            <button 
              onClick={() => setPerformanceFilter("all")}
              className={`py-1 rounded border transition-all ${performanceFilter === "all" ? "bg-slate-900 text-white border-slate-900" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"}`}
            >
              All Wards
            </button>
            <button 
              onClick={() => setPerformanceFilter("high")}
              className={`py-1 rounded border transition-all ${performanceFilter === "high" ? "bg-emerald-500 text-white border-emerald-500" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              High (75%+)
            </button>
            <button 
              onClick={() => setPerformanceFilter("warning")}
              className={`py-1 rounded border transition-all ${performanceFilter === "warning" ? "bg-amber-500 text-white border-amber-500" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              Warn
            </button>
            <button 
              onClick={() => setPerformanceFilter("critical")}
              className={`py-1 rounded border transition-all ${performanceFilter === "critical" ? "bg-red-500 text-white border-red-500" : "bg-slate-50 text-slate-600 border-slate-200"}`}
            >
              Crit
            </button>
          </div>
        </div>

        {/* Ward list scrollable */}
        <div className="flex-grow overflow-y-auto p-2 space-y-1">
          {filteredWards.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-6">No matching ward records.</p>
          ) : (
            filteredWards.map((w) => {
              const isSelected = w.wardNumber === selectedWardNumber;
              return (
                <div
                  key={w.wardNumber}
                  onClick={() => setSelectedWardNumber(w.wardNumber)}
                  className={`p-2.5 rounded-xl cursor-pointer border transition-all flex items-center justify-between ${
                    isSelected 
                      ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                      : "bg-white border-slate-100 hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>
                        W-{w.wardNumber}
                      </span>
                      <h4 className={`text-xs font-black truncate max-w-[130px] ${isSelected ? "text-white" : "text-slate-800"}`}>
                        {w.wardName}
                      </h4>
                    </div>
                    <span className={`text-[9px] block mt-1 ${isSelected ? "text-slate-400" : "text-slate-400"}`}>
                      Cllr: {w.councillor}
                    </span>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-full ${
                      w.performance >= 80 
                        ? "bg-emerald-50 text-emerald-700 font-bold" 
                        : w.performance >= 50 
                        ? "bg-amber-50 text-amber-700 font-bold" 
                        : "bg-red-50 text-red-700 animate-pulse font-bold"
                    }`}>
                      {w.performance}%
                    </span>
                    <span className="text-[8px] opacity-75 font-mono">
                      {w.stats.count} cases
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Interactive SVG Map Center Stage */}
      <div className="flex-grow flex flex-col bg-slate-900 relative">
        
        {/* Layer Controllers */}
        <div className="absolute top-4 left-4 z-10 flex items-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-sm space-x-1 text-[9px] font-black uppercase">
          <Layers className="text-gov-yellow mr-1" size={12} />
          <button
            onClick={() => setActiveLayer("blueprint")}
            className={`px-2 py-1 rounded transition-colors ${activeLayer === "blueprint" ? "bg-gov-blue text-white" : "text-slate-400 hover:text-white"}`}
          >
            Technical blueprint
          </button>
          <button
            onClick={() => setActiveLayer("satellite")}
            className={`px-2 py-1 rounded transition-colors ${activeLayer === "satellite" ? "bg-gov-blue text-white" : "text-slate-400 hover:text-white"}`}
          >
            Satellite orthophoto
          </button>
          <button
            onClick={() => setActiveLayer("heatmap")}
            className={`px-2 py-1 rounded transition-colors ${activeLayer === "heatmap" ? "bg-gov-blue text-white" : "text-slate-400 hover:text-white"}`}
          >
            Resolution Heatmap
          </button>
        </div>

        {/* Interactive GIS Stage (SVG representation of Thulamela Wards) */}
        <div className={`flex-grow flex items-center justify-center p-6 transition-all ${
          activeLayer === "satellite" 
            ? "bg-slate-950/90 relative overflow-hidden" 
            : activeLayer === "heatmap"
            ? "bg-slate-950"
            : "bg-slate-950"
        }`}>
          {/* Overlay Satellite grid image backdrop if layer active */}
          {activeLayer === "satellite" && (
            <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
              <div className="w-full h-full bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            </div>
          )}

          {/* 41 Ward Visual SVG map */}
          <div className="w-full max-w-[550px] aspect-video relative">
            <svg viewBox="0 0 580 430" className="w-full h-full select-none">
              
              {/* Outer Municipal border */}
              <rect x="10" y="10" width="560" height="410" rx="20" fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5,5" className="opacity-20" />
              
              {/* GIS Grid Nodes */}
              {gridWards.map((w) => {
                const isSelected = w.wardNumber === selectedWardNumber;
                const perfColor = getPerformanceFill(w.performance);

                return (
                  <g 
                    key={w.wardNumber}
                    onClick={() => setSelectedWardNumber(w.wardNumber)}
                    className="cursor-pointer group"
                  >
                    {/* Ward Shape */}
                    <rect
                      x={w.x}
                      y={w.y}
                      width="65"
                      height="55"
                      rx="12"
                      fill={
                        activeLayer === "heatmap" 
                          ? perfColor 
                          : activeLayer === "satellite"
                          ? "#1e293b"
                          : "#0f172a"
                      }
                      fillOpacity={
                        activeLayer === "heatmap" 
                          ? 0.4 
                          : isSelected 
                          ? 0.85 
                          : 0.5
                      }
                      stroke={isSelected ? "#eab308" : "#334155"}
                      strokeWidth={isSelected ? 2.5 : 1}
                      className="transition-all duration-300 group-hover:stroke-gov-green group-hover:fill-slate-800"
                    />

                    {/* Performance circle tracker */}
                    {activeLayer !== "heatmap" && (
                      <circle
                        cx={w.x + 50}
                        cy={w.y + 12}
                        r="5"
                        fill={perfColor}
                        className={w.performance < 45 ? "animate-ping" : ""}
                      />
                    )}

                    {/* Ward Identifier label */}
                    <text
                      x={w.x + 32.5}
                      y={w.y + 26}
                      textAnchor="middle"
                      fill={isSelected ? "#ffffff" : "#94a3b8"}
                      fontSize="9"
                      fontWeight="black"
                      className="font-mono tracking-tight"
                    >
                      W-{w.wardNumber}
                    </text>

                    {/* Mini statistics count visual */}
                    <text
                      x={w.x + 32.5}
                      y={w.y + 42}
                      textAnchor="middle"
                      fill={w.stats.count > 0 ? "#eab308" : "#475569"}
                      fontSize="8"
                      fontWeight="bold"
                    >
                      {w.stats.count} cases
                    </text>
                  </g>
                );
              })}

              {/* Draw active technician geographic markers */}
              {mockGpsTechnicians.map((tech) => (
                <g key={tech.id} className="animate-pulse">
                  <circle cx="150" cy="220" r="8" fill="#eab308" fillOpacity="0.4" />
                  <circle cx="150" cy="220" r="4" fill="#eab308" />
                  <circle cx="340" cy="180" r="8" fill="#ef4444" fillOpacity="0.4" />
                  <circle cx="340" cy="180" r="4" fill="#ef4444" />
                </g>
              ))}

            </svg>
          </div>
        </div>

        {/* GIS Footer with active coordinate tracking */}
        <div className="bg-slate-950 p-3 border-t border-slate-800 flex justify-between items-center text-[10px] font-mono text-slate-400">
          <div className="flex items-center space-x-2">
            <Radio className="text-red-500 animate-pulse" size={12} />
            <span className="font-bold text-white uppercase text-[8px] tracking-wider bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded">Telematic Live</span>
            <span>Simulating 3 Field Units (GPS South Africa)</span>
          </div>
          <span>Ref Coordinates: -22.9567 S, 30.4812 E</span>
        </div>
      </div>

      {/* 3. Right Sidebar: Inspect Details of selected ward */}
      <div className="w-full lg:w-80 border-l border-slate-100 flex flex-col justify-between p-5 space-y-4">
        
        {/* Ward Info Details Card */}
        {selectedWardInfo ? (
          <div className="space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[9px] font-mono tracking-wider text-gov-blue bg-gov-blue/10 px-2 py-0.5 rounded font-black uppercase">
                Ward Administrative Area
              </span>
              <h3 className="text-base font-black text-slate-800 uppercase mt-1">
                Ward {selectedWardInfo.wardNumber}: {selectedWardInfo.wardName}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Thulamela Local Municipality</p>
            </div>

            {/* Ward Stats Block */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Total cases</span>
                <span className="text-xl font-black font-mono text-slate-800 block">{selectedWardInfo.stats.count}</span>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Performance</span>
                <span className="text-xl font-black font-mono text-slate-800 block">{selectedWardInfo.performance}%</span>
              </div>
            </div>

            {/* Councillor block */}
            <div className="bg-white border border-slate-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                  <UserIcon size={14} className="text-slate-500" />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 block uppercase font-bold">Assigned Ward Rep</span>
                  <h5 className="font-bold text-slate-800 text-[11px] leading-none">{selectedWardInfo.councillor}</h5>
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-600">
                <span>Political Position:</span>
                <span className="text-gov-green">Ward Councillor</span>
              </div>
            </div>

            {/* Telematics GPS List */}
            <div className="space-y-2">
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">Technician Telematics</span>
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {mockGpsTechnicians.map((t) => (
                  <div key={t.id} className="p-2.5 rounded-lg border border-slate-200/60 bg-white space-y-1 leading-normal">
                    <div className="flex justify-between items-center font-bold text-[10px] text-slate-800">
                      <span>{t.name}</span>
                      <span className="text-[8px] font-mono text-slate-400">GPS Active</span>
                    </div>
                    <p className="text-[9px] text-slate-500">{t.task}</p>
                    <span className="block text-[8px] font-mono text-gov-blue">Coords: {t.lat}, {t.lng}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-12">
            <Info size={24} className="mx-auto mb-1 opacity-25" />
            <p className="text-xs font-bold">No Ward Selected</p>
          </div>
        )}

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[10px] leading-tight text-slate-500 font-medium">
          <strong>SLA Notification:</strong> Resolution rates are monitored by the Municipal Executive Admin. Ensure all high-priority ward complaints are closed under SLA guidelines.
        </div>
      </div>

    </div>
  );
}
