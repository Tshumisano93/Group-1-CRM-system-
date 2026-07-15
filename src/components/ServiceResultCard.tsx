import React, { useState } from "react";
import { Complaint, ServiceNotice } from "../types";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Users, 
  Phone, 
  ShieldAlert, 
  Wrench, 
  Layers, 
  Activity, 
  FileText, 
  CheckCircle, 
  ExternalLink, 
  Droplets, 
  Zap, 
  Trash2, 
  Lightbulb, 
  CloudRain, 
  Home, 
  Trees, 
  ChevronDown, 
  ChevronUp, 
  Mail, 
  User, 
  Map, 
  Info,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ServiceResultCardProps {
  key?: string;
  record: (Complaint | ServiceNotice) & { type: 'complaint' | 'notice' };
}

export default function ServiceResultCard({ record }: ServiceResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isComplaint = record.type === 'complaint';

  // Helper to format date
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

  // Safe cast helpers
  const notice = !isComplaint ? (record as ServiceNotice) : null;
  const complaint = isComplaint ? (record as Complaint) : null;

  // Resolve Category / Icon
  const category = record.category || "General";
  const getServiceConfig = (cat: string) => {
    const norm = cat.toLowerCase();
    if (norm.includes("water") || norm.includes("sewer") || norm.includes("sani")) {
      return { icon: Droplets, color: "text-blue-600 bg-blue-50 border-blue-200", label: "Water & Sanitation" };
    }
    if (norm.includes("elect") || norm.includes("power") || norm.includes("energy")) {
      return { icon: Zap, color: "text-amber-600 bg-amber-50 border-amber-200", label: "Electricity & Energy" };
    }
    if (norm.includes("road") || norm.includes("pothole") || norm.includes("street") && !norm.includes("light")) {
      return { icon: Wrench, color: "text-orange-600 bg-orange-50 border-orange-200", label: "Roads & Civil Works" };
    }
    if (norm.includes("light") || norm.includes("lamp")) {
      return { icon: Lightbulb, color: "text-yellow-600 bg-yellow-50 border-yellow-200", label: "Street Lighting" };
    }
    if (norm.includes("waste") || norm.includes("trash") || norm.includes("refuse") || norm.includes("dump")) {
      return { icon: Trash2, color: "text-slate-600 bg-slate-50 border-slate-200", label: "Waste Management" };
    }
    if (norm.includes("storm") || norm.includes("rain") || norm.includes("drain")) {
      return { icon: CloudRain, color: "text-indigo-600 bg-indigo-50 border-indigo-200", label: "Storm Water" };
    }
    if (norm.includes("park") || norm.includes("tree") || norm.includes("comm")) {
      return { icon: Trees, color: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Parks & Community" };
    }
    return { icon: Info, color: "text-slate-600 bg-slate-50 border-slate-200", label: category };
  };

  const serviceConfig = getServiceConfig(category);
  const ServiceIcon = serviceConfig.icon;

  // Determine priority
  const priority = record.priority || "Medium";
  const getPriorityStyle = (pri: string) => {
    const p = pri.toLowerCase();
    if (p === "critical" || p === "emergency" || p === "severe") {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (p === "high") {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (p === "medium") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  // Determine status color
  const status = record.status || "Scheduled";
  const getStatusStyle = (st: string) => {
    const s = st.toLowerCase();
    if (s === "operational" || s === "resolved" || s === "completed" || s === "closed") {
      return "bg-emerald-500 text-white shadow-sm shadow-emerald-100";
    }
    if (s === "in progress" || s === "maintenance") {
      return "bg-amber-500 text-white shadow-sm shadow-amber-100";
    }
    if (s === "delayed" || s === "waiting for parts") {
      return "bg-rose-500 text-white shadow-sm shadow-rose-100";
    }
    if (s === "emergency") {
      return "bg-red-600 text-white animate-pulse border-2 border-red-200";
    }
    return "bg-gov-blue text-white shadow-sm";
  };

  // Determine progress percentage
  let progress = 0;
  if (!isComplaint && notice) {
    progress = notice.progress || 0;
  } else if (isComplaint && complaint) {
    if (complaint.status === "Resolved" || complaint.status === "Closed") progress = 100;
    else if (complaint.status === "In Progress") progress = 60;
    else if (complaint.status === "Assigned") progress = 35;
    else progress = 10;
  }

  // Wards Affected string
  const wardsAffectedStr = !isComplaint && notice && notice.affectedWards && notice.affectedWards.length > 0
    ? `Wards: ${notice.affectedWards.join(", ")}`
    : `Ward: ${('wardNumber' in record ? record.wardNumber : undefined) || "All Wards"}`;

  const areaAffected = !isComplaint && notice 
    ? notice.affectedArea 
    : (complaint?.village || complaint?.area || "Thulamela Area");

  const streetLocation = !isComplaint && notice 
    ? notice.streetLocation 
    : (complaint?.streetAddress || complaint?.landmark || "Street address unspecified");

  const department = !isComplaint && notice 
    ? notice.department 
    : (complaint?.departmentName || "Municipal Infrastructure Unit");

  const description = record.description || "No service notice details are available.";
  const reason = !isComplaint && notice ? notice.cause : (complaint?.description || "Maintenance verification required.");
  
  const startDateStr = !isComplaint && notice 
    ? notice.dateReported 
    : (complaint?.dateCreated || new Date().toISOString());

  const endDateStr = !isComplaint && notice 
    ? notice.estimatedCompletion 
    : (complaint?.dateUpdated || "Under Review");

  const interruptionDuration = !isComplaint && notice 
    ? notice.estimatedDuration 
    : "Dependent on service restoration timeframe";

  const servicesAffected = !isComplaint && notice 
    ? notice.servicesAffected 
    : [category];

  const householdsAffected = !isComplaint && notice 
    ? notice.householdsAffected 
    : (complaint?.affectedResidents || undefined);

  const technician = !isComplaint && notice 
    ? notice.assignedTechnician 
    : (complaint?.assignedTechnicianName || "Municipal Engineering Response Crew");

  const contactNumber = !isComplaint && notice 
    ? notice.emergencyNumber 
    : "015 962 7500 (Thulamela Call Centre)";

  const lastUpdated = !isComplaint && notice 
    ? notice.lastUpdated 
    : (complaint?.dateUpdated || complaint?.dateCreated);

  const gpsCoordinates = record.gpsCoordinates || undefined;
  
  const photos = !isComplaint && notice 
    ? notice.photos 
    : (complaint?.supportingImages || (complaint?.referencePhoto ? [complaint.referencePhoto] : []));

  const videos = !isComplaint && notice 
    ? notice.videos 
    : (complaint?.video ? [complaint.video] : []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Visual top border indicator for service type */}
      <div className={`h-1.5 w-full ${isComplaint ? 'bg-orange-500' : 'bg-gov-green'}`} />

      <div className="p-5 flex-1 flex flex-col space-y-4">
        {/* Row 1: Badges & Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`p-2 rounded-xl border ${serviceConfig.color}`}>
              <ServiceIcon size={16} />
            </span>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 leading-none">
                {isComplaint ? "COMPLAINT CASE" : "MAINTENANCE NOTICE"}
              </p>
              <h4 className="text-xs font-bold text-slate-700">{serviceConfig.label}</h4>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className={`text-[10px] px-2 py-1 font-extrabold rounded-lg uppercase tracking-wider ${getPriorityStyle(priority)}`}>
              {priority}
            </span>
            <span className={`text-[10px] px-2.5 py-1 font-black rounded-lg uppercase tracking-wider ${getStatusStyle(status)}`}>
              {status}
            </span>
          </div>
        </div>

        {/* Row 2: Title */}
        <div>
          <h3 className="font-extrabold text-base text-slate-900 leading-snug hover:text-gov-green transition-colors">
            {record.title || "Routine Utility Maintenance"}
          </h3>
          <p className="text-[10px] font-mono text-slate-400 mt-1 flex items-center space-x-2">
            <span>REF: {record.id || `REF-${Date.now().toString().slice(-4)}`}</span>
            <span>•</span>
            <span>Updated: {formatDate(lastUpdated)}</span>
          </p>
        </div>

        {/* Row 3: Progress Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-extrabold text-slate-500 flex items-center gap-1">
              <Activity size={12} className="text-gov-green" />
              Progress
            </span>
            <span className="font-mono font-bold text-slate-800">{progress}%</span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gov-green rounded-full" 
            />
          </div>
        </div>

        {/* Row 4: Key Details Grid */}
        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="flex items-start space-x-2">
            <Layers size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Affected Scope</p>
              <p className="font-bold text-slate-800">{wardsAffectedStr}</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Village/Suburb</p>
              <p className="font-bold text-slate-800 truncate" title={areaAffected}>{areaAffected}</p>
            </div>
          </div>
        </div>

        {/* Brief description excerpt */}
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
          {description}
        </p>

        {/* Action Toggler */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-xs font-black text-gov-blue hover:text-gov-blue-hover transition-colors uppercase tracking-wider"
          >
            <span>{isExpanded ? "Hide Full Specs" : "View Complete Specs"}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          
          {gpsCoordinates && (
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${gpsCoordinates}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center space-x-1 text-[10px] font-bold text-emerald-600 hover:underline"
            >
              <ExternalLink size={12} />
              <span>Map Route</span>
            </a>
          )}
        </div>

        {/* Expanded complete details segment */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden pt-4 space-y-4 text-xs border-t border-slate-100"
            >
              {/* Detailed Operational Blueprint Grid */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-extrabold text-slate-800 text-[10px] uppercase tracking-wider border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <Wrench size={12} className="text-gov-green" />
                  Engineering Specification Sheet
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Street / Location</span>
                    <span className="text-slate-800 font-semibold">{streetLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Department Responsible</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      <Home size={12} className="text-slate-500" />
                      {department}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Work Description</span>
                    <span className="text-slate-800 block text-xs leading-normal font-medium">{description}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Reason for Maintenance / Cause</span>
                    <span className="text-slate-800 block text-xs leading-normal font-medium">{reason}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Date Maintenance Started</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      <Calendar size={12} className="text-slate-500" />
                      {formatDate(startDateStr)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Expected Completion</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      <CheckCircle size={12} className="text-emerald-600" />
                      {formatDate(endDateStr)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Service Interruption Duration</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      <Timer size={12} className="text-slate-500" />
                      {interruptionDuration}
                    </span>
                  </div>
                  {householdsAffected !== undefined && (
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Households Affected</span>
                      <span className="text-slate-800 font-semibold flex items-center gap-1">
                        <Users size={12} className="text-slate-500" />
                        {householdsAffected.toLocaleString()} Households
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Assigned Supervisor / Technician</span>
                    <span className="text-slate-800 font-semibold flex items-center gap-1">
                      <User size={12} className="text-slate-500" />
                      {technician}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide">Direct Line Contact</span>
                    <span className="text-gov-blue font-bold flex items-center gap-1">
                      <Phone size={12} className="text-gov-blue" />
                      {contactNumber}
                    </span>
                  </div>
                </div>

                {/* Sub-services affected */}
                {servicesAffected && servicesAffected.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wide mb-1">Services Affected / Interrupted</span>
                    <div className="flex flex-wrap gap-1.5">
                      {servicesAffected.map((s, idx) => (
                        <span key={idx} className="bg-red-50 text-red-700 border border-red-100 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase">
                          ❌ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Photos & Videos attached by the municipality */}
              {((photos && photos.length > 0) || (videos && videos.length > 0)) && (
                <div className="space-y-2">
                  <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">Multimedia Documentation</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {photos?.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 group bg-slate-100">
                        <img 
                          src={url} 
                          alt="Maintenance Site Reference" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 font-bold rounded">
                          Photo {i + 1}
                        </span>
                      </div>
                    ))}
                    {videos?.map((url, i) => (
                      <div key={i} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center text-white">
                        <span className="text-xs font-bold text-slate-300">🎥 Attached Video ({i + 1})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GIS Map Location widget */}
              {gpsCoordinates && (
                <div className="space-y-2">
                  <h5 className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Map size={12} className="text-slate-400" />
                    GIS Geolocation Coordinate Mapping
                  </h5>
                  <div className="bg-slate-100 border border-slate-200 rounded-xl overflow-hidden p-1 relative">
                    {/* Simulated visual high-end mini-map */}
                    <div className="bg-[#E5E9F0] h-32 rounded-lg relative overflow-hidden flex flex-col justify-between p-3 border border-slate-300/60 shadow-inner">
                      {/* Abstract grid lines simulating a blueprint/GIS grid */}
                      <div className="absolute inset-0 opacity-10" style={{ 
                        backgroundImage: "radial-gradient(#000 1px, transparent 1px)", 
                        backgroundSize: "16px 16px" 
                      }} />
                      {/* Abstract river/road simulation */}
                      <div className="absolute left-1/4 top-0 bottom-0 w-3 bg-[#4A90E2]/20 blur-[1px] rotate-12" />
                      <div className="absolute left-0 right-0 top-1/2 h-4 bg-slate-300/40 -rotate-6" />

                      {/* Map badge details */}
                      <div className="bg-white/90 backdrop-blur-xs text-[9px] px-2 py-1 rounded-md shadow-sm border border-slate-200 z-10 self-start font-bold">
                        🎯 GIS Fixed Node: {gpsCoordinates}
                      </div>

                      {/* Pulsing Pin Indicator */}
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                        <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                        </span>
                        <span className="bg-red-600 text-white font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow mt-1 uppercase tracking-wide whitespace-nowrap">
                          {category} Event Pin
                        </span>
                      </div>

                      {/* Map controls preview */}
                      <div className="flex justify-between items-end w-full mt-auto z-10">
                        <div className="flex gap-1">
                          <button disabled className="w-5 h-5 bg-white rounded shadow text-[9px] font-extrabold flex items-center justify-center border border-slate-200 text-slate-400">+</button>
                          <button disabled className="w-5 h-5 bg-white rounded shadow text-[9px] font-extrabold flex items-center justify-center border border-slate-200 text-slate-400">-</button>
                        </div>
                        
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${gpsCoordinates}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-gov-blue hover:bg-gov-blue-hover text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded shadow-md flex items-center gap-1 transition-colors"
                        >
                          <ExternalLink size={10} />
                          Open Live Map
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
    </div>
  );
}
