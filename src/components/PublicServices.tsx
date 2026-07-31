import React, { useState, useEffect, useMemo } from "react";
import { 
  Droplets, 
  Zap, 
  Trash2, 
  Lightbulb, 
  Trees, 
  Users, 
  Home, 
  CloudRain, 
  Wrench, 
  ArrowRight, 
  Info, 
  X, 
  ShieldAlert, 
  Clock,
  Building2,
  Search,
  MapPin,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Phone,
  Layers,
  Activity,
  User,
  SlidersHorizontal,
  Map,
  Timer,
  ChevronDown,
  ChevronUp,
  Image,
  Video,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Mail,
  Check
} from "lucide-react";
import { ServiceNotice } from "../types";
import { getServiceNotices } from "../db";
import { motion, AnimatePresence } from "motion/react";

interface Service {
  id: string;
  title: string;
  icon: React.ReactNode;
  shortDesc: string;
  longDesc: string;
  sla: string; // Service Level Agreement Response Time
  manager: string;
  contact: string;
  operatingProcedures: string[];
}

interface PublicServicesProps {
  initialServiceId?: string | null;
  onClearInitialService?: () => void;
}

export default function PublicServices({ initialServiceId, onClearInitialService }: PublicServicesProps) {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  
  // Modal filters & tabs
  const [activeTab, setActiveTab] = useState<"notices" | "sla">("notices");
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalWardFilter, setModalWardFilter] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState("");
  const [modalPriorityFilter, setModalPriorityFilter] = useState("");
  const [modalSortOrder, setModalSortOrder] = useState("priority");
  
  // Track expanded notices inside the list
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Sync state with database in real-time
  useEffect(() => {
    setNotices(getServiceNotices());
    const handleUpdate = () => setNotices(getServiceNotices());
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  // Reset modal states when selected service changes
  useEffect(() => {
    if (selectedService) {
      setActiveTab("notices");
      setModalSearchQuery("");
      setModalWardFilter("");
      setModalStatusFilter("");
      setModalPriorityFilter("");
      setModalSortOrder("priority");
      setExpandedNoticeId(null);
    }
  }, [selectedService]);

  // Global notice search filtering with priority ordering
  const globalFilteredNotices = useMemo(() => {
    if (!searchQuery) return [];
    return notices.filter(n => 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.affectedArea && n.affectedArea.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => {
      const priorityWeight = (p?: string) => {
        if (!p) return 0;
        const pl = p.toLowerCase();
        if (pl === "critical" || pl === "emergency" || pl === "severe") return 4;
        if (pl === "high") return 3;
        if (pl === "medium") return 2;
        return 1;
      };
      // Sort matching results in order of priority (Critical -> High -> Medium -> Low)
      return priorityWeight(b.priority) - priorityWeight(a.priority);
    });
  }, [notices, searchQuery]);

  // Helper to resolve which notices belong to which service card
  const isNoticeForService = (n: ServiceNotice, serviceId: string): boolean => {
    if (serviceId === "emergency") {
      return n.priority === "Critical" || n.status === "Emergency";
    }
    
    const cat = n.category.toLowerCase();
    switch (serviceId) {
      case "water":
        return cat.includes("water") && !cat.includes("storm");
      case "electricity":
        return cat.includes("elect") || cat.includes("power") || cat.includes("energy");
      case "roads":
        return cat.includes("road") || cat.includes("pothole");
      case "waste":
        return cat.includes("waste") || cat.includes("trash") || cat.includes("refuse") || cat.includes("dump");
      case "sanitation":
        return cat.includes("sewer") || cat.includes("sani") || cat.includes("sludge");
      case "stormwater":
        return cat.includes("storm") || cat.includes("drain") || cat.includes("rain");
      case "lighting":
        return cat.includes("light") || cat.includes("lamp") || cat.includes("mast");
      case "parks":
        return cat.includes("park") || cat.includes("tree") || cat.includes("grass");
      case "housing":
        return cat.includes("hous") || cat.includes("settle") || cat.includes("rdp");
      default:
        return false;
    }
  };

  // Local notices for selected service with complete search, filter and sort logic
  const modalFilteredNotices = useMemo(() => {
    if (!selectedService) return [];
    
    return notices.filter(n => {
      // 1. Category membership check
      const belongs = isNoticeForService(n, selectedService.id);
      if (!belongs) return false;

      // 2. Text search query
      const search = modalSearchQuery.trim().toLowerCase();
      const matchesSearch = !search || (
        n.title.toLowerCase().includes(search) ||
        n.description.toLowerCase().includes(search) ||
        n.id.toLowerCase().includes(search) ||
        (n.affectedArea && n.affectedArea.toLowerCase().includes(search)) ||
        (n.streetLocation && n.streetLocation.toLowerCase().includes(search)) ||
        (n.assignedTechnician && n.assignedTechnician.toLowerCase().includes(search)) ||
        (n.referenceNumber && n.referenceNumber.toLowerCase().includes(search))
      );

      // 3. Ward filter
      const matchesWard = !modalWardFilter || (
        n.affectedWards && n.affectedWards.includes(Number(modalWardFilter))
      );

      // 4. Status filter
      const matchesStatus = !modalStatusFilter || (
        n.status.toLowerCase() === modalStatusFilter.toLowerCase()
      );

      // 5. Priority filter
      const matchesPriority = !modalPriorityFilter || (
        n.priority.toLowerCase() === modalPriorityFilter.toLowerCase()
      );

      return matchesSearch && matchesWard && matchesStatus && matchesPriority;
    }).sort((a, b) => {
      const priorityWeight = (p?: string) => {
        if (!p) return 0;
        const pl = p.toLowerCase();
        if (pl === "critical" || pl === "emergency" || pl === "severe") return 4;
        if (pl === "high") return 3;
        if (pl === "medium") return 2;
        return 1;
      };

      if (modalSortOrder === "priority") {
        const diff = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (diff !== 0) return diff;
      }

      const aDate = new Date(a.dateReported || 0).getTime();
      const bDate = new Date(b.dateReported || 0).getTime();

      if (modalSortOrder === "newest") return bDate - aDate;
      if (modalSortOrder === "oldest") return aDate - bDate;
      if (modalSortOrder === "progress") return (b.progress || 0) - (a.progress || 0);

      return bDate - aDate;
    });
  }, [selectedService, notices, modalSearchQuery, modalWardFilter, modalStatusFilter, modalPriorityFilter, modalSortOrder]);

  const services: Service[] = [
    {
      id: "emergency",
      title: "Emergency Services",
      icon: <ShieldAlert className="text-red-600 animate-pulse" size={28} />,
      shortDesc: "Disaster response, immediate hazard warnings, firefighting coordination, and high-risk safety actions.",
      longDesc: "The Municipal Disaster Management division coordinates instant response to localized fire events, severe seasonal flooding, collapsed networks, and urgent safety warnings in partnership with provincial services.",
      sla: "Immediate Dispatch (Under 15 minutes) for verified active disasters.",
      manager: "Collen Nemavhola",
      contact: "emergency.management@thulamela.gov.za • 015 962 7500",
      operatingProcedures: [
        "Continuous 24-hour disaster alert line scanning.",
        "Coordinated structural rescue and fire containment dispatches.",
        "Rapid routing of emergency relief equipment to storm-damaged sectors."
      ]
    },
    {
      id: "water",
      title: "Water Supply",
      icon: <Droplets className="text-gov-blue" size={28} />,
      shortDesc: "Clean drinking water, borehole grids, pipeline repairs, and municipal tanker dispatching.",
      longDesc: "Operating hand-in-hand with Vhembe District Municipality to sustain local reservoir loads, clear major pipe bursts, manage solar and electrical village pump stations, and route tankers during grid dropouts.",
      sla: "24 Hours for primary burst lines, 48 Hours for general valve replacements.",
      manager: "Nnditsheni Mudau",
      contact: "water.services@thulamela.gov.za • 015 962 7611",
      operatingProcedures: [
        "Continuous pressure and hygiene monitoring at rural feeder tanks.",
        "Pre-scheduled pipe-relaying along corrosive zinc pipelines.",
        "Water tanker deployment to clinics, hospitals, and schools."
      ]
    },
    {
      id: "electricity",
      title: "Electricity & Grid",
      icon: <Zap className="text-gov-yellow" size={28} />,
      shortDesc: "Substation repairs, electrical transformer overhauls, and municipal cabling upgrades.",
      longDesc: "Managing medium and high-voltage grid corridors across all 41 wards. Coordinating load-reduction, replacing blown transformers, and resolving localized cable faults.",
      sla: "12 Hours for dangerous snapped live cables, 24 Hours for transformer replacements.",
      manager: "Avhapfani Nemamilwe",
      contact: "energy@thulamela.gov.za • 015 962 7612",
      operatingProcedures: [
        "Aerial and physical inspections of transformer heat markers.",
        "Replacing localized isolator panels following thermal expansion issues.",
        "Pre-winter line insulation audits to minimize wet weather short-outs."
      ]
    },
    {
      id: "roads",
      title: "Road Maintenance",
      icon: <Wrench className="text-gov-green" size={28} />,
      shortDesc: "Arterial road patching, asphalt grading, pothole repairs, and clear street signage.",
      longDesc: "Sustaining local street safety and access networks. Tasks range from cold-mix pothole repairs on major transit links to continuous grading of agricultural gravel roads.",
      sla: "48 Hours for dangerous transit potholes, 7 Days for minor gravel road grading.",
      manager: "Thilivhali Nemutudi",
      contact: "infrastructure@thulamela.gov.za • 015 962 7613",
      operatingProcedures: [
        "Continuous tar base consolidation and hot-mix asphalt layers.",
        "Grading secondary agricultural routes after heavy precipitation.",
        "Deploying warning markers and detour layouts in roadwork sectors."
      ]
    },
    {
      id: "waste",
      title: "Waste Collection",
      icon: <Trash2 className="text-slate-600" size={28} />,
      shortDesc: "Weekly household refuse removal, waste landfill operations, and illegal dumping clean-ups.",
      longDesc: "Managing daily and weekly domestic and commercial garbage collection logs, sustaining the licensed municipal landfill, and removing hazardous roadside dumping piles.",
      sla: "Scheduled weekly bin collections. 48 Hours for addressing hazardous dumping alerts.",
      manager: "Tshilidzi Khorommbi",
      contact: "waste@thulamela.gov.za • 015 962 7614",
      operatingProcedures: [
        "Sustaining clean landfill compacting and sorting workflows.",
        "Positioning large steel skip bins in high-traffic retail strips.",
        "Public education alerts on environmental safety and recycling rules."
      ]
    },
    {
      id: "sanitation",
      title: "Sanitation & Sewer",
      icon: <Droplets className="text-blue-500" size={28} />,
      shortDesc: "Blocked sewer jetting, pump station repairs, and vacuum suction septic tanks service.",
      longDesc: "Ensuring hygienic living conditions through high-pressure jetting of blocked sewer lines, septic tank emptying, and maintaining sub-surface sanitation lines.",
      sla: "24 Hours for raw sewage spills, 5 Days for routine household septic suction.",
      manager: "Nnditsheni Mudau",
      contact: "water.services@thulamela.gov.za • 015 962 7611",
      operatingProcedures: [
        "Instant chemical sanitization and washdown of spill locations.",
        "Extracting solid household rubbish from main junction lines.",
        "Upgrading sub-surface concrete pipes to crack-resistant PVC."
      ]
    },
    {
      id: "stormwater",
      title: "Storm Water Drainage",
      icon: <CloudRain className="text-slate-700" size={28} />,
      shortDesc: "Concrete channel clearing, concrete culvert repairs, and flash-flood warning measures.",
      longDesc: "Directing summer rainfall safely. Focuses on clearing storm-water drains, reinforcing culvert links, and ensuring street channels are free of branches and sand build-up.",
      sla: "24 Hours during high rainfall warnings. 5 Days for clearing minor blocked channels.",
      manager: "Thilivhali Nemutudi",
      contact: "infrastructure@thulamela.gov.za • 015 962 7613",
      operatingProcedures: [
        "Spring sand-clearing sweeps of municipal storm gutters.",
        "Replacing damaged concrete bridge structures after high rain events.",
        "SAPS coordination for low-lying bridge closures during high-risk floods."
      ]
    },
    {
      id: "lighting",
      title: "Street Lighting",
      icon: <Lightbulb className="text-amber-500" size={28} />,
      shortDesc: "Solar light installations, high-mast floodlight maintenance, and copper cable checks.",
      longDesc: "Sustaining night visibility on routes and public nodes. Upgrading street lights to LED and fixing structural high-mast safety illumination to combat local crime hot spots.",
      sla: "48 Hours for dangerous unlit junctions, 5 Days for individual bulb replacements.",
      manager: "Khathu Ndou",
      contact: "streetlights@thulamela.gov.za • 015 962 7615",
      operatingProcedures: [
        "Converting active street networks to solar and power-saving LED models.",
        "Coordinating bucket crane teams for rapid high-mast bulb swaps.",
        "Anti-theft locks on electrical substation panels."
      ]
    },
    {
      id: "community",
      title: "Community Services",
      icon: <Users className="text-purple-600" size={28} />,
      shortDesc: "Municipal hall bookings, local sports complex operations, and cemetery register controls.",
      longDesc: "Sustaining public community venues, processing bookings for local sports fields, maintaining local cemeteries, and organizing civic social development platforms.",
      sla: "24 Hours to process facility bookings, 48 Hours for prep work on booked dates.",
      manager: "Pfarelo Ravele",
      contact: "parks@thulamela.gov.za • 015 962 7616",
      operatingProcedures: [
        "Online calendar scheduling for municipal halls.",
        "Continuous care and mapping of municipal graves.",
        "Coordinating maintenance at village sports grounds."
      ]
    },
    {
      id: "parks",
      title: "Parks & Open Spaces",
      icon: <Trees className="text-emerald-600" size={28} />,
      shortDesc: "Roadside grass sweeping, tree pruning near power lines, and open field cleanups.",
      longDesc: "Improving local ecological look by mowing parks, clearing dangerous overhanging tree branches from power line tracks, and maintaining park recreational gear.",
      sla: "7 Days for standard grass-cutting sweeps, 48 Hours for urgent hazard branches.",
      manager: "Pfarelo Ravele",
      contact: "parks@thulamela.gov.za • 015 962 7616",
      operatingProcedures: [
        "Routine cleanups of roadside brush along highway blind turns.",
        "Mowing public children's parks to ensure safety.",
        "Planting native shade trees near local bus stops."
      ]
    },
    {
      id: "infrastructure",
      title: "Infrastructure & Buildings",
      icon: <Building2 className="text-gov-blue" size={28} />,
      shortDesc: "Building draft controls, spatial safety inspections, and capital project operations.",
      longDesc: "Evaluating commercial and housing building plans, assessing local building safety, and managing municipal capital projects to ensure compliance with structural engineering rules.",
      sla: "14 Days for building plan evaluations. 48 Hours to inspect safety alerts.",
      manager: "Thilivhali Nemutudi",
      contact: "infrastructure@thulamela.gov.za • 015 962 7613",
      operatingProcedures: [
        "Evaluating and approving industrial and domestic construction drafts.",
        "Enforcing safety standards at municipal offices and building sites.",
        "Drafting future spatial expansion plans for rural-to-urban shifts."
      ]
    },
    {
      id: "housing",
      title: "Human Settlements",
      icon: <Home className="text-red-500" size={28} />,
      shortDesc: "RDP housing register coordination, low-cost allocations, and settlement safety audits.",
      longDesc: "Partnering with national department grids to administer the local RDP housing waitlist, evaluating low-cost housing allocations, and auditing informal settlement safety after storms.",
      sla: "Application audits inside 48 Hours, urgent storm settlement reviews in 24 Hours.",
      manager: "Pfarelo Ravele",
      contact: "parks@thulamela.gov.za • 015 962 7616",
      operatingProcedures: [
        "Updating the municipal housing waiting list.",
        "Inspecting RDP structural integrity and reporting construction defects.",
        "Allocating emergency materials to families affected by fires or storms."
      ]
    }
  ];

  // Pre-select service and tab based on props or URL query parameters (deep-linking)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sId = initialServiceId || params.get("service");
    const t = params.get("tab");
    if (sId) {
      const matched = services.find(s => s.id === sId.toLowerCase());
      if (matched) {
        setSelectedService(matched);
        if (t === "sla") {
          setActiveTab("sla");
        }
      }
    }
  }, [initialServiceId]);

  // Formatting date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  // Status and Priority CSS classes
  const getPriorityStyle = (pri: string) => {
    const p = pri.toLowerCase();
    if (p === "critical" || p === "emergency" || p === "severe") return "bg-rose-100 text-rose-800 border-rose-200";
    if (p === "high") return "bg-red-100 text-red-800 border-red-200";
    if (p === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getStatusStyle = (st: string) => {
    const s = st.toLowerCase();
    if (s === "operational" || s === "completed" || s === "resolved") return "bg-emerald-500 text-white";
    if (s === "in progress" || s === "maintenance") return "bg-amber-500 text-white";
    if (s === "delayed") return "bg-rose-500 text-white";
    if (s === "emergency") return "bg-red-600 text-white animate-pulse";
    return "bg-gov-blue text-white";
  };

  return (
    <div id="public-services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-gov-blue font-bold text-xs uppercase tracking-widest block">Municipal Mandate</span>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Our Services & Standards</h1>
        <div className="w-16 h-1 bg-gov-yellow mx-auto"></div>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Thulamela Municipality is dedicated to providing affordable, reliable, and high-quality services, guided by our motto: We Serve With Dedication. Click on any service card below to view live maintenance notices, schedules, and service level standards.
        </p>

        {/* Global Quick Search Input */}
        <div className="relative max-w-md mx-auto mt-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search live maintenance notices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-gov-green/50 font-semibold shadow-xs text-base"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Global Quick Search Results Area */}
      {searchQuery && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp size={14} className="text-gov-green" />
              Live Query Matches sorted by priority
            </h2>
            <button 
              onClick={() => setSearchQuery("")} 
              className="text-xs font-bold text-gov-blue hover:underline"
            >
              Clear Search
            </button>
          </div>

          {globalFilteredNotices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {globalFilteredNotices.map((n) => (
                <div 
                  key={n.id} 
                  className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityStyle(n.priority)}`}>
                        {n.priority}
                      </span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${getStatusStyle(n.status)}`}>
                        {n.status}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 leading-snug">{n.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{n.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">REF: {n.referenceNumber || n.id}</span>
                    <button 
                      onClick={() => {
                        const s = services.find(x => n.category.toLowerCase().includes(x.id) || x.id === "water" && n.category === "Water" || x.id === "sanitation" && n.category === "Sewer");
                        setSelectedService(s || services[0]);
                      }}
                      className="text-xs font-bold text-gov-green hover:underline flex items-center gap-1"
                    >
                      View Operations <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600 font-bold text-xs">
                No active maintenance or service notices were found for your search.
              </p>
              <p className="text-slate-400 text-[10px] mt-1">
                Try searching for general categories like "Water", "Power", "Sewer" or ward coordinates.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Services Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div 
            key={svc.id}
            onClick={() => setSelectedService(svc)}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-gov-green/30 cursor-pointer transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-gov-green/5 group-hover:scale-105 transition-all">
                {svc.icon}
              </div>
              <h3 className="text-base font-extrabold text-slate-950 uppercase tracking-wide group-hover:text-gov-green transition-colors">
                {svc.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                {svc.shortDesc}
              </p>
            </div>

            <div className="text-xs text-gov-green hover:text-gov-green-hover font-black flex items-center space-x-1.5 pt-2 hover:underline transition-all w-fit">
              <span>View Notice Feed & SLA</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>

      {/* COMPREHENSIVE SERVICE NOTICES & SLA MODAL */}
      <AnimatePresence>
        {selectedService && (
          <div 
            id="service-detail-modal" 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-5xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh]"
            >
              
              {/* Modal Banner Header */}
              <div className="bg-slate-900 text-white p-6 relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-800 gap-4">
                <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10 scale-150">
                  {selectedService.icon}
                </div>
                
                <div className="flex items-center space-x-4 z-10">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl text-white border border-white/15">
                    {selectedService.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">{selectedService.title} Operations</h3>
                    <p className="text-xs text-slate-300 font-medium">Departmental Command Hub • Thulamela Local Municipality</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 z-10">
                  <button 
                    onClick={() => {
                      setSelectedService(null);
                      if (onClearInitialService) {
                        onClearInitialService();
                      }
                      window.location.hash = "#services";
                    }}
                    className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs (Notices vs SLA) */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center space-x-4">
                <button
                  onClick={() => setActiveTab("notices")}
                  className={`py-4 text-xs font-black uppercase tracking-wider border-b-2 px-1 transition-all flex items-center gap-2 ${
                    activeTab === "notices"
                      ? "border-gov-green text-gov-green font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Activity size={14} />
                  Live Maintenance Feed ({modalFilteredNotices.length})
                </button>
                <button
                  onClick={() => setActiveTab("sla")}
                  className={`py-4 text-xs font-black uppercase tracking-wider border-b-2 px-1 transition-all flex items-center gap-2 ${
                    activeTab === "sla"
                      ? "border-gov-green text-gov-green font-black"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Clock size={14} />
                  Department Standards & SLA
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

                {/* TAB 1: LIVE MAINTENANCE & SERVICE NOTICES FEED */}
                {activeTab === "notices" && (
                  <div className="space-y-6">
                    
                    {/* Local Filter Control Panel inside Modal */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                          <SlidersHorizontal size={12} />
                          Local Feed Controls
                        </span>
                        <button 
                          onClick={() => {
                            setModalSearchQuery("");
                            setModalWardFilter("");
                            setModalStatusFilter("");
                            setModalPriorityFilter("");
                          }}
                          className="text-[10px] font-bold text-gov-blue hover:underline"
                        >
                          Reset Filters
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                        {/* Search Input */}
                        <div className="relative md:col-span-2">
                          <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                          <input 
                            type="text" 
                            placeholder="Search by Village, Street or Ref..."
                            value={modalSearchQuery}
                            onChange={(e) => setModalSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-gov-green text-base"
                          />
                        </div>

                        {/* Ward Dropdown */}
                        <select
                          value={modalWardFilter}
                          onChange={(e) => setModalWardFilter(e.target.value)}
                          className="py-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-gov-green text-base"
                        >
                          <option value="">All Wards (1-41)</option>
                          {Array.from({ length: 41 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>Ward {i + 1}</option>
                          ))}
                        </select>

                        {/* Status Dropdown */}
                        <select
                          value={modalStatusFilter}
                          onChange={(e) => setModalStatusFilter(e.target.value)}
                          className="py-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-gov-green text-base"
                        >
                          <option value="">All Statuses</option>
                          <option value="Scheduled">Scheduled</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Delayed">Delayed</option>
                          <option value="Completed">Completed</option>
                          <option value="Emergency">Emergency</option>
                        </select>

                        {/* Priority Sort order */}
                        <select
                          value={modalSortOrder}
                          onChange={(e) => setModalSortOrder(e.target.value)}
                          className="py-2 px-3 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-gov-green text-base"
                        >
                          <option value="priority">Priority First</option>
                          <option value="newest">Newest Date</option>
                          <option value="oldest">Oldest Date</option>
                          <option value="progress">Progress %</option>
                        </select>
                      </div>
                    </div>

                    {/* Notices Stream */}
                    {modalFilteredNotices.length > 0 ? (
                      <div className="space-y-4">
                        {modalFilteredNotices.map((n) => {
                          const isExpanded = expandedNoticeId === n.id;
                          const progress = n.progress || 0;

                          return (
                            <div 
                              key={n.id}
                              className="bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-200 transition-all overflow-hidden"
                            >
                              {/* Notice Row Summary */}
                              <div 
                                onClick={() => setExpandedNoticeId(isExpanded ? null : n.id)}
                                className="p-4 sm:p-5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none hover:bg-slate-50/50"
                              >
                                <div className="space-y-2 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-mono font-black text-slate-400">REF: {n.referenceNumber || n.id}</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${getPriorityStyle(n.priority)}`}>
                                      {n.priority} Priority
                                    </span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${getStatusStyle(n.status)}`}>
                                      {n.status}
                                    </span>
                                  </div>
                                  <h4 className="text-base font-black text-slate-900 leading-snug">{n.title}</h4>
                                  
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-bold">
                                    <span className="flex items-center gap-1">
                                      <Layers size={12} className="text-slate-400" />
                                      Wards: {n.affectedWards?.join(", ") || "All"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <MapPin size={12} className="text-slate-400" />
                                      {n.affectedArea}
                                    </span>
                                  </div>
                                </div>

                                {/* Progress and toggle section */}
                                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                                  <div className="text-right shrink-0">
                                    <div className="text-xs text-slate-400 font-bold">Progress</div>
                                    <div className="text-sm font-mono font-black text-slate-800">{progress}%</div>
                                    <div className="w-24 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                      <div className="bg-gov-green h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                  </div>
                                  
                                  <button className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all shrink-0">
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                </div>
                              </div>

                              {/* Collapsible SPEC SHEET area containing ALL 19 requested fields! */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 space-y-6 overflow-hidden"
                                  >
                                    {/* 3-Column Fields Registry */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      
                                      {/* Column A: Service Identification & Details */}
                                      <div className="space-y-4">
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">1. Maintenance ID</span>
                                          <span className="text-xs font-mono font-black text-slate-800 block bg-slate-100 px-2 py-1 rounded w-fit">{n.referenceNumber || n.id}</span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">2. Ward Number</span>
                                          <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                                            <Layers size={13} className="text-slate-400" />
                                            Ward {n.affectedWards?.join(", ") || "All Wards"}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">3. Village/Suburb</span>
                                          <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                                            <MapPin size={13} className="text-slate-400" />
                                            {n.affectedArea}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">4. Street/Location</span>
                                          <span className="text-xs font-bold text-slate-800 block">
                                            {n.streetLocation || "Main Access Corridors"}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">5. Service Type</span>
                                          <span className="text-xs font-bold text-gov-green uppercase block">{n.category}</span>
                                        </div>
                                      </div>

                                      {/* Column B: Timeline & Interruption details */}
                                      <div className="space-y-4">
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">6. Priority Level</span>
                                          <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md border inline-block ${getPriorityStyle(n.priority)}`}>
                                            {n.priority}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">7. Status</span>
                                          <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-md inline-block ${getStatusStyle(n.status)}`}>
                                            {n.status}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">8. Start Date and Time</span>
                                          <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                                            <Calendar size={13} className="text-slate-400" />
                                            {formatDate(n.dateReported)}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">9. Expected Completion Date and Time</span>
                                          <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                                            <CheckCircle size={13} className="text-emerald-500" />
                                            {formatDate(n.estimatedCompletion)}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">10. Number of Households Affected</span>
                                          <span className="text-xs font-bold text-slate-800 block">
                                            {n.householdsAffected ? `${n.householdsAffected.toLocaleString()} Households` : "General Regional Grid Flow"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Column C: Responsible Staff & Verification */}
                                      <div className="space-y-4">
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">11. Assigned Department</span>
                                          <span className="text-xs font-bold text-slate-800 block">{n.department}</span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">12. Assigned Technician</span>
                                          <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                                            <User size={13} className="text-slate-400" />
                                            {n.assignedTechnician || "Municipal Engineering Response Grid"}
                                          </span>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">13. Contact Number</span>
                                          <a href={`tel:${n.emergencyNumber || "0159627500"}`} className="text-xs font-black text-gov-blue block hover:underline flex items-center gap-1">
                                            <Phone size={13} />
                                            {n.emergencyNumber || "015 962 7500"}
                                          </a>
                                        </div>

                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">14. Last Updated timestamp</span>
                                          <span className="text-xs font-bold text-slate-800 block">
                                            {formatDate(n.lastUpdated || n.dateReported)}
                                          </span>
                                        </div>
                                        
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">15. Progress Percentage</span>
                                          <div className="space-y-1">
                                            <div className="text-xs font-black text-slate-800 font-mono">{progress}% Complete</div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                              <div className="bg-gov-green h-full rounded-full" style={{ width: `${progress}%` }}></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                    </div>

                                    {/* 16. Issue Description */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">16. Issue Description</span>
                                        <p className="text-xs text-slate-700 leading-relaxed font-semibold">{n.description}</p>
                                      </div>
                                      <div className="bg-white p-4 rounded-xl border border-slate-200">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Reason / Cause for Maintenance</span>
                                        <p className="text-xs text-slate-700 leading-relaxed font-semibold">{n.cause}</p>
                                      </div>
                                    </div>

                                    {/* 17. Timeline of updates */}
                                    {n.timeline && n.timeline.length > 0 && (
                                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                                          17. Timeline of updates
                                        </span>
                                        <div className="relative border-l border-slate-200 pl-4 space-y-3 ml-2">
                                          {n.timeline.map((item, idx) => (
                                            <div key={idx} className="relative">
                                              <span className="absolute -left-6.5 top-1 bg-white border-2 border-gov-green rounded-full w-2.5 h-2.5 z-10" />
                                              <span className="text-[9px] font-mono font-black text-slate-400 block">{item.time}</span>
                                              <span className="text-xs font-bold text-slate-700 block mt-0.5">{item.description}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* 18. Photos and Videos */}
                                    {((n.photos && n.photos.length > 0) || (n.videos && n.videos.length > 0)) && (
                                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                          18. Photos and Videos
                                        </span>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                          {n.photos?.map((pUrl, pIdx) => (
                                            <div key={pIdx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-50 group">
                                              <img 
                                                src={pUrl} 
                                                alt="Site Snapshot" 
                                                referrerPolicy="no-referrer"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                                              />
                                              <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded font-bold">Photo {pIdx + 1}</span>
                                            </div>
                                          ))}
                                          {n.videos?.map((vUrl, vIdx) => (
                                            <div key={vIdx} className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center text-white font-black text-[9px] uppercase tracking-wide">
                                              <span>🎥 Attached Video ({vIdx + 1})</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* 19. GPS Map Location */}
                                    {n.gpsCoordinates && (
                                      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                          <Map size={12} className="text-gov-green" />
                                          19. GPS Map Location
                                        </span>
                                        
                                        <div className="bg-slate-100 border border-slate-200 rounded-xl p-1 relative overflow-hidden">
                                          <div className="bg-[#E5E9F0] h-36 rounded-lg relative overflow-hidden flex flex-col justify-between p-3 border border-slate-300/40">
                                            {/* Abstract grid lines */}
                                            <div className="absolute inset-0 opacity-10" style={{ 
                                              backgroundImage: "radial-gradient(#000 1px, transparent 1px)", 
                                              backgroundSize: "16px 16px" 
                                            }} />
                                            {/* Mock secondary pathways */}
                                            <div className="absolute left-1/3 top-0 bottom-0 w-2.5 bg-blue-300/20 blur-[1px]" />
                                            <div className="absolute left-0 right-0 top-1/2 h-3 bg-slate-300/40 -rotate-3" />

                                            {/* GIS fixed beacon */}
                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                                              <span className="flex h-3.5 w-3.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600"></span>
                                              </span>
                                              <span className="bg-red-600 text-white font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow mt-1 uppercase">
                                                Active Operations Node
                                              </span>
                                            </div>

                                            <div className="bg-white/90 text-[8px] font-black px-2 py-1 rounded shadow-sm border border-slate-200 z-10 self-start">
                                              Coordinate Node: {n.gpsCoordinates}
                                            </div>

                                            <div className="z-10 self-end">
                                              <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${n.gpsCoordinates}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="bg-gov-blue hover:bg-gov-blue-hover text-white text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded shadow flex items-center gap-1"
                                              >
                                                <ExternalLink size={9} />
                                                Open Live GPS Link
                                              </a>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center max-w-xl mx-auto">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 text-gov-green">
                          <CheckCircle size={28} />
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
                          No active maintenance notices for this service.
                        </h3>
                        <p className="text-slate-500 text-xs leading-relaxed mt-2">
                          All systems for the {selectedService.title} department are currently functioning normally across all 41 wards of Thulamela Municipality. No major outages or operations scheduled.
                        </p>
                      </div>
                    )}

                  </div>
                )}

                {/* TAB 2: SERVICE STANDARDS & SLA COMMITMENT SUMMARY */}
                {activeTab === "sla" && (
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div>
                        <h4 className="text-[10px] uppercase text-slate-400 font-extrabold tracking-widest font-mono">Department Overview</h4>
                        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-1 font-semibold">
                          {selectedService.longDesc}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h5 className="text-[10px] uppercase text-slate-400 font-black tracking-widest font-mono flex items-center mb-1">
                            <Clock size={12} className="mr-1 text-gov-blue" />
                            Response Commitment (SLA)
                          </h5>
                          <p className="text-xs font-black text-slate-900">
                            {selectedService.sla}
                          </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <h5 className="text-[10px] uppercase text-slate-400 font-black tracking-widest font-mono flex items-center mb-1">
                            <User size={12} className="mr-1 text-gov-green" />
                            Department Head / Director
                          </h5>
                          <p className="text-xs font-black text-slate-900">
                            {selectedService.manager}
                          </p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <h4 className="text-[10px] uppercase text-slate-400 font-extrabold tracking-widest font-mono">Key Operational Guidelines</h4>
                        <ul className="space-y-2.5 text-xs text-slate-600 font-semibold">
                          {selectedService.operatingProcedures.map((proc, i) => (
                            <li key={i} className="flex items-start">
                              <span className="w-2 h-2 rounded-full bg-gov-yellow mt-1.5 mr-2.5 flex-shrink-0" />
                              <span>{proc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-500 font-mono space-y-3 sm:space-y-0">
                        <div className="space-y-1">
                          <span className="block font-bold uppercase tracking-widest text-slate-400">Direct Department Contacts</span>
                          <span className="text-gov-blue font-black block text-xs">{selectedService.contact}</span>
                        </div>
                        <span className="bg-gov-green/10 text-gov-green px-2.5 py-1 rounded-md uppercase font-black text-[9px] border border-gov-green/15 shadow-2xs">
                          We Serve With Dedication
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer Controls */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedService(null)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-2xs"
                >
                  Close Department Command
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
