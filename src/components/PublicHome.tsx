import React, { useState, useEffect } from "react";
import heroBackground from "../assets/images/thulamela_hero_bg_1783705604428.jpg";
import municipalityLogo from "../assets/images/thulamela_coat_of_arms.png";
import { 
  getComplaints, 
  getAnnouncements, 
  getWards, 
  getUsers,
  getServiceNotices 
} from "../db";
import { ServiceNotice } from "../types";
import { 
  Search, 
  ArrowRight, 
  PhoneCall, 
  MapPin, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  Users, 
  Percent, 
  Layers,
  Droplets,
  Zap,
  Truck,
  Trash2,
  ShieldAlert,
  Wrench,
  Phone,
  User,
  Timer,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  X,
  Map,
  Video,
  Image as ImageIcon,
  SlidersHorizontal,
  Activity
} from "lucide-react";
import PublicFeedbackForm from "./PublicFeedbackForm";
import ServiceSearch from "./ServiceSearch";
import { motion, AnimatePresence } from "motion/react";

// Helper to resolve which notices belong to which service card on the homepage
const isNoticeForService = (n: ServiceNotice, label: string): boolean => {
  const l = label.toLowerCase();
  if (l === "emergency") {
    return n.priority === "Critical" || n.priority === "High" || n.status === "Emergency" || n.category === "General";
  }
  
  const cat = (n.category || "").toLowerCase();
  switch (l) {
    case "water":
      return cat.includes("water") || cat.includes("sewer") || cat.includes("storm") || cat.includes("sanitation");
    case "electricity":
      return cat.includes("elect") || cat.includes("power") || cat.includes("energy") || cat.includes("street");
    case "roads":
      return cat.includes("road") || cat.includes("pothole") || cat.includes("traffic") || cat.includes("park");
    case "waste":
      return cat.includes("waste") || cat.includes("trash") || cat.includes("refuse") || cat.includes("dump") || cat.includes("house");
    default:
      return true;
  }
};

// Formats or defaults 19 required fields of a notice to prevent runtime exceptions
const getNoticeDetails = (notice: ServiceNotice) => {
  return {
    id: notice.id || `MNT-${Date.now().toString().slice(-6)}`,
    wardNumber: notice.affectedWards && notice.affectedWards.length > 0 ? `Wards: ${notice.affectedWards.join(", ")}` : "Ward 12, 15",
    village: notice.affectedArea || "Thohoyandou",
    streetLocation: notice.streetLocation || "Main Access Road",
    category: notice.category || "Water Supply",
    description: notice.description || "Routine preventative maintenance and network optimization in progress.",
    priority: notice.priority || "Medium",
    status: notice.status || "In Progress",
    startDate: notice.dateReported ? new Date(notice.dateReported).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "N/A",
    expectedCompletion: notice.estimatedCompletion ? new Date(notice.estimatedCompletion).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "N/A",
    department: notice.department || "Technical Services Department",
    technician: notice.assignedTechnician || "Municipal Response Crew",
    contactNumber: notice.emergencyNumber || "015 962 7500",
    householdsAffected: notice.householdsAffected !== undefined ? notice.householdsAffected : 250,
    progress: notice.progress !== undefined ? notice.progress : 50,
    timeline: notice.timeline && notice.timeline.length > 0 ? notice.timeline : [
      { time: "2026-07-14 08:00", description: "Maintenance scheduled and warning notices published." },
      { time: "2026-07-14 09:30", description: "Technician crew arrived on site. Repairs in progress." }
    ],
    photos: notice.photos && notice.photos.length > 0 ? notice.photos : ["https://images.unsplash.com/photo-1542060748-10c28b629f6f?auto=format&fit=crop&q=80&w=600"],
    videos: notice.videos && notice.videos.length > 0 ? notice.videos : [],
    gpsCoordinates: notice.gpsCoordinates || "-22.9567, 30.4812",
    lastUpdated: notice.lastUpdated ? new Date(notice.lastUpdated).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" }) : "N/A"
  };
};

interface PublicHomeProps {
  onNavigate: (view: string, serviceId?: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function PublicHome({ onNavigate, onAddToast }: PublicHomeProps) {
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [activeCouncillors, setActiveCouncillors] = useState(3); // seeded cllrs
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const [notices, setNotices] = useState<ServiceNotice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedNotice, setSelectedNotice] = useState<ServiceNotice | null>(null);

  useEffect(() => {
    const complaints = getComplaints();
    setComplaintsCount(complaints.length);
    setResolvedCount(complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length);
    
    const users = getUsers();
    setActiveCouncillors(users.filter(u => u.role === "councillor" && u.status === "active").length);

    // Sync notices
    setNotices(getServiceNotices());
    const handleUpdate = () => {
      setNotices(getServiceNotices());
    };
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  const announcements = getAnnouncements();

  return (
    <div id="public-home" className="space-y-12 bg-[#F8F9FA]">
      {/* 1. Hero and Side Panel Split Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col lg:flex-row items-stretch">
          {/* Left Column: Hero Content */}
          <div className="w-full lg:w-7/12 p-8 lg:p-12 flex flex-col justify-center space-y-6 relative overflow-hidden bg-white">
            <img src={heroBackground} alt="Hero Background" className="absolute inset-0 w-full h-full object-cover z-0 opacity-20" />
            <img src={municipalityLogo} alt="Thulamela Municipality Logo" className="absolute right-10 top-1/4 w-80 h-80 object-contain z-[1] opacity-10 mix-blend-multiply" />
            <div className="relative z-10 space-y-6">
              <span className="text-gov-blue font-bold text-xs uppercase tracking-widest block">
                Service Excellence for All 41 Wards
              </span>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1] uppercase tracking-tight">
                Welcome to the <span className="text-gov-green">CRM System</span> for Ward Councillors
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl pr-6">
                This digital platform empowers Ward Councillors to report, monitor and manage service delivery complaints across all 41 wards while improving communication, accountability, and transparency between municipal departments and local communities.
              </p>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-2">
                <button
                  id="hero-cllr-login"
                  onClick={() => onNavigate("councillor-login")}
                  className="px-8 py-4 bg-gov-blue hover:bg-gov-blue-hover text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
                >
                  <span>Councillor Login Portal</span>
                  <ArrowRight size={16} />
                </button>
                
                <button
                  id="hero-services"
                  onClick={() => onNavigate("services")}
                  className="px-8 py-4 bg-gov-yellow hover:bg-gov-yellow-hover text-slate-950 rounded-xl font-bold uppercase tracking-wider text-xs shadow-md transition-all text-center"
                >
                  Municipal Services
                </button>
              </div>

              {/* Quick Municipal Search Bar */}
              <div className="pt-4 max-w-xl">
                <p className="text-sm text-slate-600 font-medium">Use the search tool below to find specific complaints or service notices.</p>
              </div>
            </div>
          </div>

          {/* Right Column: SIDE PANEL: STATS & SERVICES */}
          <div className="w-full lg:w-5/12 bg-slate-50 p-8 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-slate-200">
            {/* STATS GRID */}
            <div className="flex flex-col gap-2">
              {complaintsCount === 0 && (
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">System Performance</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 px-2.5 py-1 rounded">
                    Demo Preview
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => onNavigate("wards")}
                  className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-gov-green cursor-pointer hover:shadow-md transition-all"
                >
                  <p className="text-3xl font-black text-gov-green font-mono">41</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Active Wards</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-gov-blue">
                  <p className="text-3xl font-black text-gov-blue font-mono">
                    {complaintsCount > 0 ? Math.round((resolvedCount / complaintsCount) * 100) : 94}%
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Resolution Rate</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-gov-yellow">
                  <p className="text-3xl font-black text-slate-800 font-mono">
                    {complaintsCount > 0 ? complaintsCount : "1,240"}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Total Cases</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-slate-400">
                  <p className="text-3xl font-black text-slate-800 font-mono">48h</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Avg. Response</p>
                </div>
              </div>
            </div>

            {/* SERVICE QUICK LINKS */}
            <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center">
                  <span className="w-2.5 h-5 bg-gov-yellow mr-2 rounded-sm"></span>
                  Priority Services
                </h3>
                <div className="space-y-3">
                  <div 
                    onClick={() => onNavigate("services", "water")}
                    className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-gov-green/30 hover:bg-white hover:shadow-xs cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm mr-3">
                      <Droplets size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Water Supply</p></div>
                    <button className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                  <div 
                    onClick={() => onNavigate("services", "electricity")}
                    className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-gov-green/30 hover:bg-white hover:shadow-xs cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-sm mr-3">
                      <Zap size={16} className="text-yellow-600" />
                    </div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Electricity & Grid</p></div>
                    <button className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                  <div 
                    onClick={() => onNavigate("services", "roads")}
                    className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-gov-green/30 hover:bg-white hover:shadow-xs cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm mr-3">
                      <Truck size={16} className="text-emerald-600" />
                    </div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Roads Maintenance</p></div>
                    <button className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                  <div 
                    onClick={() => onNavigate("services", "waste")}
                    className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-gov-green/30 hover:bg-white hover:shadow-xs cursor-pointer transition-all"
                  >
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm mr-3">
                      <Trash2 size={16} className="text-amber-600" />
                    </div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Waste Logistics</p></div>
                    <button className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Interactive Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-6">
        <ServiceSearch onSearchActive={setIsSearchActive} />
        
        <AnimatePresence mode="wait">
          {!isSearchActive && (
            <motion.div
              key="homepage-default-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-12"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Municipal Wards Portal</h2>
                <p className="text-slate-600 mb-6 text-sm max-w-lg mx-auto">Explore all 41 local wards, contact your ward councillor, and track service requests.</p>
                <button onClick={() => onNavigate("wards")} className="bg-gov-blue text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all">
                  View All 41 Wards
                </button>
              </div>

              {/* Live Service Summary Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { icon: Droplets, label: "Water", color: "text-blue-500" },
                  { icon: Zap, label: "Electricity", color: "text-yellow-500" },
                  { icon: Truck, label: "Roads", color: "text-red-500" },
                  { icon: Trash2, label: "Waste", color: "text-green-500" },
                  { icon: ShieldAlert, label: "Emergency", color: "text-orange-500" },
                ].map(item => {
                  const activeCount = notices.filter(n => isNoticeForService(n, item.label)).length;
                  return (
                    <button 
                      key={item.label} 
                      onClick={() => {
                        setSelectedCategory(item.label);
                        const filtered = notices.filter(n => isNoticeForService(n, item.label));
                        setSelectedNotice(filtered.length > 0 ? filtered[0] : null);
                      }} 
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center hover:shadow-md hover:border-gov-green/30 cursor-pointer transition-all w-full text-center"
                    >
                      <item.icon className={item.color} size={24} />
                      <span className="text-xs font-bold mt-2">{item.label}</span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {activeCount} {activeCount === 1 ? 'Notice' : 'Notices'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Emergency Banner dynamically powered by Firestore notices */}
              {(() => {
                const urgentNotice = notices.find(n => n.priority === "Critical" || n.priority === "High" || n.status === "Emergency") || notices[0];
                return (
                  <div id="emergency-banner" className="w-full">
                    <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6 border border-slate-800 shadow-sm">
                      <div className="flex items-center space-x-3 flex-1 text-left">
                        <span className="bg-red-600 text-[10px] font-black px-2.5 py-1 rounded uppercase animate-pulse shrink-0">
                          {urgentNotice?.priority === "Critical" ? "Critical Alert" : "Urgent Notice"}
                        </span>
                        <p className="text-xs font-medium text-slate-300 leading-relaxed">
                          <strong className="text-white mr-1.5">{urgentNotice ? urgentNotice.title : "Thulamela Customer Care Hotline Active"}</strong>
                          <span className="text-slate-400">
                            {urgentNotice ? `${urgentNotice.affectedArea || 'Thulamela Municipality'} - ${urgentNotice.description}` : "Contact 015 962 4140 for 24/7 emergency municipal service reporting."}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 shrink-0">
                        {urgentNotice && (
                          <button
                            onClick={() => setSelectedNotice(urgentNotice)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border border-slate-700"
                          >
                            View Notice
                          </button>
                        )}
                        <button
                          id="emergency-banner-call"
                          onClick={() => window.open("tel:0159624140")}
                          className="bg-gov-yellow hover:bg-gov-yellow-hover text-slate-950 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm"
                        >
                          24/7 Hotline: 015 962 4140
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Live Service Notices & Disruptions Feed */}
              <div id="live-service-notices-section" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center">
                      <AlertTriangle className="mr-2 text-amber-500" size={20} />
                      <span>Live Municipal Service Notices & Disruptions</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time updates directly from Thulamela Technical Services Department
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1.5"></span>
                      Database Live ({notices.length})
                    </span>
                    {selectedCategory && (
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-bold underline"
                      >
                        Show All
                      </button>
                    )}
                  </div>
                </div>

                {(() => {
                  const filtered = selectedCategory 
                    ? notices.filter(n => isNoticeForService(n, selectedCategory))
                    : notices;

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
                        <h4 className="text-sm font-bold text-slate-800">No active disruptions reported</h4>
                        <p className="text-xs text-slate-500 mt-1">All municipal services in this category are operating normally.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map(notice => {
                        const isCritical = notice.priority === "Critical" || notice.priority === "High";
                        return (
                          <div
                            key={notice.id}
                            onClick={() => setSelectedNotice(notice)}
                            className="group border border-slate-200 hover:border-gov-green/50 bg-slate-50/50 hover:bg-white p-4 rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  isCritical 
                                    ? "bg-red-100 text-red-800 border border-red-200" 
                                    : "bg-blue-100 text-blue-800 border border-blue-200"
                                }`}>
                                  {notice.category}
                                </span>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                  notice.priority === "Critical" ? "bg-red-600 text-white" :
                                  notice.priority === "High" ? "bg-amber-500 text-white" :
                                  "bg-slate-200 text-slate-700"
                                }`}>
                                  {notice.priority}
                                </span>
                              </div>

                              <h3 className="text-sm font-black text-slate-900 group-hover:text-gov-green transition-colors line-clamp-2">
                                {notice.title}
                              </h3>

                              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                                {notice.description}
                              </p>

                              <div className="mt-3 space-y-1 text-[11px] text-slate-500">
                                <div className="flex justify-between">
                                  <span className="font-medium">Area:</span>
                                  <span className="font-bold text-slate-700 truncate max-w-[150px]">{notice.affectedArea || "All Wards"}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="font-medium">Ref #:</span>
                                  <span className="font-mono text-slate-600">{notice.referenceNumber || notice.id}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                              <span className="text-[10px] text-slate-400 font-mono">
                                {notice.dateReported ? new Date(notice.dateReported).toLocaleDateString("en-ZA") : "Recent"}
                              </span>
                              <span className="text-xs font-black text-gov-green flex items-center group-hover:translate-x-0.5 transition-transform">
                                Details &rarr;
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* 3. News, Announcements & Community Board */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
                {/* News and Announcements */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center">
                      <FileText className="mr-2 text-gov-green" size={20} />
                      <span>Latest News & Announcements</span>
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-gov-green/10 text-gov-green px-2.5 py-1 rounded">
                      Updated Daily
                    </span>
                  </div>

                  <div className="space-y-4">
                    {announcements.map((ann, idx) => (
                      <div 
                        key={ann.id}
                        className={`bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all ${
                          ann.isEmergency ? "border-l-4 border-l-gov-yellow" : ""
                        }`}
                      >
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-2">
                          <span className="flex items-center text-slate-400 font-mono">
                            <Calendar size={12} className="mr-1" />
                            {ann.date}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider ${
                            ann.type === "announcement"
                              ? "bg-amber-100 text-amber-800"
                              : ann.type === "event"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {ann.type}
                          </span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 hover:text-gov-green transition-colors leading-snug">
                          {ann.title}
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mt-2">
                          {ann.content}
                        </p>
                        <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-3 text-[10px]">
                          <span className="text-slate-400 uppercase font-mono tracking-wider">Author: {ann.author}</span>
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">{ann.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Community Notice Board Column */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="border-b border-slate-200 pb-3">
                    <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center">
                      <Calendar className="mr-2 text-gov-blue" size={20} />
                      <span>Community Notice Board</span>
                    </h2>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Quick Actions */}
                    <div className="p-5 border-b border-slate-200 bg-slate-50">
                      <h3 className="font-extrabold text-[10px] uppercase text-slate-500 tracking-wider mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button
                          onClick={() => onNavigate("services")}
                          className="w-full text-left bg-white border border-slate-200 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-700 hover:text-gov-green hover:border-gov-green hover:shadow-sm flex items-center justify-between transition-all"
                        >
                          <span>Browse Municipal Services</span>
                          <ArrowRight size={14} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                          className="w-full text-left bg-white border border-slate-200 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-700 hover:text-gov-blue hover:border-gov-blue hover:shadow-sm flex items-center justify-between transition-all"
                        >
                          <span>{isFeedbackOpen ? "Close Feedback Form" : "Submit Public Feedback"}</span>
                          <ArrowRight size={14} className="text-slate-400" />
                        </button>
                      </div>
                    </div>

                    {isFeedbackOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white rounded-2xl border border-slate-200 mt-4 p-4 shadow-md overflow-hidden"
                      >
                        <PublicFeedbackForm onAddToast={onAddToast} />
                      </motion.div>
                    )}

                    <div className="p-5 space-y-4">
                      <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-gov-blue border-b border-slate-100 pb-1">Upcoming Events</h4>
                      
                      <div className="flex space-x-3 items-start border-b border-slate-100 pb-3">
                        <div className="bg-gov-yellow/10 text-gov-yellow-hover p-2 rounded-lg font-mono text-center min-w-12">
                          <span className="block text-sm font-black leading-none">15</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider">JUL</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-950">IDP Consulting (Ward 1-10)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Civic Hall • 10:00 AM</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start border-b border-slate-100 pb-3">
                        <div className="bg-gov-green/10 text-gov-green p-2 rounded-lg font-mono text-center min-w-12">
                          <span className="block text-sm font-black leading-none">22</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider">JUL</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-950">Electrical Grid Upgrade Shut</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Sibasa Substation • 08:00 AM</p>
                        </div>
                      </div>

                      <div className="flex space-x-3 items-start">
                        <div className="bg-gov-blue/10 text-gov-blue p-2 rounded-lg font-mono text-center min-w-12">
                          <span className="block text-sm font-black leading-none">28</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider">JUL</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-950">Mayor's Executive Town Hall</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5 font-mono">Thohoyandou Stadium • 11:30 AM</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MUNICIPAL SERVICE NOTICES DETAIL MODAL */}
      <AnimatePresence>
        {selectedCategory && (
          <div 
            id="public-service-modal" 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-6xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-4 max-h-[92vh]"
            >
              
              {/* Modal Top Header Banner */}
              <div className="bg-slate-900 text-white p-6 relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-800 gap-4 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl text-white border border-white/15">
                    {selectedCategory === "Water" && <Droplets className="text-blue-400" size={24} />}
                    {selectedCategory === "Electricity" && <Zap className="text-yellow-400" size={24} />}
                    {selectedCategory === "Roads" && <Truck className="text-red-400" size={24} />}
                    {selectedCategory === "Waste" && <Trash2 className="text-green-400" size={24} />}
                    {selectedCategory === "Emergency" && <ShieldAlert className="text-orange-400 animate-pulse" size={24} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">{selectedCategory} Service Maintenance</h3>
                    <p className="text-xs text-slate-300 font-medium">Live Service Notices Feed • Thulamela Local Municipality</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => {
                      setSelectedCategory(null);
                      setSelectedNotice(null);
                    }}
                    className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Close</span>
                  </button>
                </div>
              </div>

              {/* Modal Body: Split-pane Layout */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-[450px]">
                
                {/* Left Pane: Notices Index List */}
                <div className="w-full md:w-5/12 border-r border-slate-200 flex flex-col bg-slate-50 overflow-y-auto max-h-[30vh] md:max-h-full">
                  <div className="p-4 bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Active Notices ({notices.filter(n => isNoticeForService(n, selectedCategory)).length})
                    </p>
                  </div>
                  
                  <div className="divide-y divide-slate-200 flex-1">
                    {notices.filter(n => isNoticeForService(n, selectedCategory)).length > 0 ? (
                      notices.filter(n => isNoticeForService(n, selectedCategory)).map((noticeItem) => {
                        const isCurrent = selectedNotice?.id === noticeItem.id;
                        return (
                          <div
                            key={noticeItem.id}
                            onClick={() => setSelectedNotice(noticeItem)}
                            className={`p-4 cursor-pointer transition-all ${
                              isCurrent 
                                ? "bg-white border-l-4 border-l-gov-green" 
                                : "hover:bg-slate-100 bg-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="text-[9px] font-mono font-bold text-slate-400">REF: {noticeItem.referenceNumber || noticeItem.id}</span>
                              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                                noticeItem.priority === "Critical" || noticeItem.priority === "Emergency"
                                  ? "bg-rose-100 text-rose-800"
                                  : noticeItem.priority === "High"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}>
                                {noticeItem.priority}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">{noticeItem.title}</h4>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold mt-1.5">
                              <MapPin size={10} className="text-slate-400 shrink-0" />
                              <span className="truncate">{noticeItem.affectedArea}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-500 h-full flex flex-col items-center justify-center">
                        <p className="text-xs font-bold text-slate-700">No active maintenance notices for this service.</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">All municipal systems in this sector are currently operating under standard performance levels.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Pane: Comprehensive Detailed Record */}
                <div className="w-full md:w-7/12 flex flex-col overflow-y-auto p-6 space-y-6 bg-white max-h-[50vh] md:max-h-full">
                  {selectedNotice ? (() => {
                    const det = getNoticeDetails(selectedNotice);
                    return (
                      <div className="space-y-6">
                        {/* Summary Header of currently selected notice */}
                        <div className="border-b border-slate-100 pb-4">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Maintenance ID: {det.id}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                              (det.priority as string) === "Critical"
                                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                : det.priority === "High"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}>
                              Priority Level: {det.priority}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                              (det.status as string) === "Completed" || (det.status as string) === "Operational"
                                ? "bg-emerald-500 text-white"
                                : "bg-amber-500 text-white"
                            }`}>
                              Status: {det.status}
                            </span>
                          </div>
                          
                          <h4 className="text-lg font-black text-slate-900 leading-snug">{selectedNotice.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 font-bold">
                            <Clock size={11} />
                            <span>Last Updated: {det.lastUpdated}</span>
                          </p>
                        </div>

                        {/* Interactive Progress Meter */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-500 flex items-center gap-1">
                              <Activity size={12} className="text-gov-green" />
                              Progress Percentage
                            </span>
                            <span className="font-mono font-black text-slate-800">{det.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gov-green rounded-full transition-all duration-500" 
                              style={{ width: `${det.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Specs Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Ward Number</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <Layers size={13} className="text-slate-400" />
                              {det.wardNumber}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Village / Suburb</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <MapPin size={13} className="text-slate-400" />
                              {det.village}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Street / Location</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <MapPin size={13} className="text-slate-400" />
                              {det.streetLocation}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Service Type</span>
                            <span className="text-xs font-bold text-gov-blue uppercase mt-0.5 block">{det.category}</span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Start Date and Time</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <Calendar size={13} className="text-slate-400" />
                              {det.startDate}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Expected Completion Date and Time</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <CheckCircle size={13} className="text-emerald-500" />
                              {det.expectedCompletion}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Assigned Department</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <Building2 size={13} className="text-slate-400" />
                              {det.department}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Assigned Technician</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <User size={13} className="text-slate-400" />
                              {det.technician}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Contact Number</span>
                            <a href={`tel:${det.contactNumber}`} className="text-xs font-bold text-gov-blue hover:underline flex items-center gap-1.5 mt-0.5">
                              <Phone size={13} className="text-gov-blue" />
                              {det.contactNumber}
                            </a>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Number of Households Affected</span>
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                              <Users size={13} className="text-slate-400" />
                              {det.householdsAffected.toLocaleString()} Households
                            </span>
                          </div>

                        </div>

                        {/* Issue Description */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Issue Description</span>
                          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/60 font-semibold">
                            {det.description}
                          </p>
                        </div>

                        {/* Timeline of Updates */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <Clock size={12} />
                            Timeline of Updates
                          </span>
                          <div className="border-l-2 border-slate-200 pl-4 ml-2 space-y-4">
                            {det.timeline.map((item, i) => (
                              <div key={i} className="relative">
                                <span className="absolute -left-[23px] top-1.5 bg-white border-2 border-gov-green w-2.5 h-2.5 rounded-full inline-block"></span>
                                <div className="space-y-0.5 text-xs">
                                  <span className="font-mono text-[9px] text-slate-400 block">{item.time}</span>
                                  <p className="font-semibold text-slate-700">{item.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Photos and Videos */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <ImageIcon size={12} />
                            Photos and Videos
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            {det.photos.map((photoUrl, i) => (
                              <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                <img 
                                  src={photoUrl} 
                                  alt="Maintenance site snap" 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover" 
                                />
                                <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                  Photo {i + 1}
                                </span>
                              </div>
                            ))}
                            
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center text-slate-400">
                              <div className="text-center p-3 space-y-1">
                                <Video size={20} className="mx-auto text-slate-500 animate-pulse" />
                                <span className="text-[9px] font-black tracking-wide block uppercase text-slate-400">Municipal Video Stream</span>
                                <span className="text-[8px] text-slate-500 block">No active streams for this incident</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* GPS Map Location */}
                        <div className="space-y-3">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                            <Map size={12} />
                            GPS Map Location
                          </span>
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-1 relative overflow-hidden">
                            <div className="bg-[#E5E9F0] h-32 rounded-xl relative overflow-hidden flex flex-col justify-between p-3 border border-slate-300/40 shadow-inner">
                              <div className="absolute inset-0 opacity-10" style={{ 
                                backgroundImage: "radial-gradient(#000 1px, transparent 1px)", 
                                backgroundSize: "14px 14px" 
                              }} />
                              
                              <div className="bg-white/90 backdrop-blur-xs text-[9px] px-2 py-1 rounded-md shadow-sm border border-slate-200 z-10 self-start font-bold">
                                GPS Coordinates: {det.gpsCoordinates}
                              </div>

                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                                <span className="flex h-3 w-3 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                                </span>
                              </div>

                              <div className="flex justify-between items-end w-full z-10">
                                <div className="flex gap-1">
                                  <button disabled className="w-5 h-5 bg-white rounded shadow text-[9px] font-extrabold flex items-center justify-center border border-slate-200 text-slate-400">+</button>
                                  <button disabled className="w-5 h-5 bg-white rounded shadow text-[9px] font-extrabold flex items-center justify-center border border-slate-200 text-slate-400">-</button>
                                </div>
                                <a 
                                  href={`https://www.google.com/maps/search/?api=1&query=${det.gpsCoordinates}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-gov-blue hover:bg-gov-blue-hover text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-md flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <ExternalLink size={10} />
                                  Open in Google Maps
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })() : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                      <p className="font-bold text-xs">No Notice Selected</p>
                      <p className="text-[10px] text-slate-400 mt-1">Select a notice from the left pane to view its comprehensive operational specifications.</p>
                    </div>
                  )}
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
