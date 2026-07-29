import React, { useState } from "react";
import { Search, FileText, Calendar, Tag, Clock, Image as ImageIcon, CheckCircle2, AlertCircle, MapPin, Building2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, isFirebaseEnabled } from "../firebase";
import { getComplaints } from "../db";
import { Complaint } from "../types";

interface PublicTrackingProps {
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
  onNavigate?: (view: string) => void;
}

export default function PublicTracking({ onAddToast, onNavigate }: PublicTrackingProps) {
  const [refNumber, setRefNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [complaint, setComplaint] = useState<Complaint | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = refNumber.trim();

    if (!cleanId) {
      onAddToast("Validation Error", "Please enter a valid reference number.", "warning");
      return;
    }

    setLoading(true);
    setComplaint(null);

    try {
      let foundComplaint: Complaint | null = null;

      // First check Firestore if enabled
      if (isFirebaseEnabled && db) {
        try {
          const docRef = doc(db, "complaints", cleanId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            foundComplaint = docSnap.data() as Complaint;
          }
        } catch (fsErr) {
          console.warn("Firestore lookup failed, falling back to local store:", fsErr);
        }
      }

      // Fallback check local store if not found in Firestore
      if (!foundComplaint) {
        const localComplaints = getComplaints();
        const localMatch = localComplaints.find(
          (c) => c.id.toLowerCase() === cleanId.toLowerCase()
        );
        if (localMatch) {
          foundComplaint = localMatch;
        }
      }

      if (foundComplaint) {
        setComplaint(foundComplaint);
        onAddToast("Record Found", `Loaded details for complaint ${foundComplaint.id}.`, "success");
      } else {
        onAddToast("Record Not Found", "No complaint found with that number.", "error");
      }
    } catch (error) {
      console.error("Error fetching complaint:", error);
      onAddToast("Lookup Error", "No complaint found with that number.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "New":
      case "Submitted":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "In Progress":
      case "Investigating":
      case "Dispatched":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "Resolved":
      case "Completed":
      case "Verified":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "Closed":
        return "bg-slate-100 text-slate-800 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-gov-yellow font-bold text-xs uppercase tracking-widest block">
          Public Enquiry Portal
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
          Track Service Complaint
        </h1>
        <div className="w-16 h-1 bg-gov-green mx-auto"></div>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Enter your official complaint reference number (e.g. COMP-1721234567) to view real-time status updates, category classification, and timestamps.
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-4">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block text-xs uppercase tracking-wider">
              Enter your Reference Number *
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="e.g. COMP-1721234567"
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-gov-green focus:bg-white transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3.5 bg-gov-green hover:bg-gov-green-hover text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Track</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Complaint Details Result Card */}
      {complaint && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden space-y-0 divide-y divide-slate-100">
          {/* Card Header */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                Complaint Reference
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-mono text-gov-yellow tracking-wider">
                {complaint.id}
              </h2>
              <p className="text-xs text-slate-300 font-medium pt-1">
                {complaint.title}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-4 py-1.5 text-xs font-black uppercase tracking-wider rounded-full border shadow-sm ${getStatusBadgeStyle(complaint.status)}`}>
                {complaint.status}
              </span>
            </div>
          </div>

          {/* Details Body */}
          <div className="p-6 sm:p-8 space-y-6 text-xs">
            {/* Grid Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold">
                  <Tag size={14} className="text-gov-blue" />
                  <span>Category</span>
                </div>
                <p className="text-sm font-extrabold text-slate-800">
                  {complaint.category}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold">
                  <Calendar size={14} className="text-gov-green" />
                  <span>Date Created</span>
                </div>
                <p className="text-sm font-extrabold text-slate-800">
                  {complaint.dateCreated ? new Date(complaint.dateCreated).toLocaleString() : "N/A"}
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center space-x-1.5 text-slate-500 font-bold">
                  <Clock size={14} className="text-amber-600" />
                  <span>Last Updated</span>
                </div>
                <p className="text-sm font-extrabold text-slate-800">
                  {complaint.dateUpdated ? new Date(complaint.dateUpdated).toLocaleString() : "N/A"}
                </p>
              </div>
            </div>

            {/* Ward & GPS Location */}
            {(complaint.wardNumber || complaint.gpsCoordinates) && (
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                {complaint.wardNumber && (
                  <div className="flex items-center space-x-2 text-slate-700 font-bold">
                    <Building2 size={16} className="text-gov-green" />
                    <span>Ward {complaint.wardNumber} {complaint.wardName ? `(${complaint.wardName})` : ""}</span>
                  </div>
                )}
                {complaint.gpsCoordinates && (
                  <div className="flex items-center space-x-2 text-slate-700 font-bold font-mono">
                    <MapPin size={16} className="text-amber-600" />
                    <span>GPS: {complaint.gpsCoordinates}</span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px]">
                Description
              </h4>
              <p className="text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                {complaint.description}
              </p>
            </div>

            {/* Supporting Image Preview */}
            {complaint.supportingImages && complaint.supportingImages.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <ImageIcon size={14} className="text-gov-blue" />
                  <span>Submitted Photograph</span>
                </h4>
                <div className="rounded-xl overflow-hidden border border-slate-200 max-w-md bg-slate-900">
                  <img
                    src={complaint.supportingImages[0]}
                    alt="Complaint Evidence"
                    className="w-full h-auto max-h-72 object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
