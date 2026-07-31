import React, { useState } from "react";
import { 
  Check, 
  MapPin, 
  AlertCircle, 
  Send, 
  Copy, 
  FileText, 
  Building2, 
  Tag, 
  Phone, 
  User, 
  MessageSquare,
  Sparkles
} from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, ControlPosition } from "@vis.gl/react-google-maps";
import { doc, setDoc } from "firebase/firestore";
import { db, isFirebaseEnabled } from "../firebase";
import { handleFirestoreError, OperationType, getComplaints, saveComplaints } from "../db";
import { SEED_WARDS } from "../data";
import { Complaint } from "../types";
import FileUploader from "./FileUploader";

interface PublicComplaintFormProps {
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
  onNavigate?: (view: string) => void;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

const CATEGORIES = [
  "Water Services",
  "Electricity & Energy",
  "Roads and Stormwater",
  "Solid Waste",
  "Community Services & Halls",
  "Parks & Open Spaces",
  "Human Settlements & Housing"
];

const PREFERRED_CONTACT_METHODS: Array<"SMS" | "Email" | "Call" | "WhatsApp"> = [
  "SMS",
  "Email",
  "Call",
  "WhatsApp"
];

export default function PublicComplaintForm({ onAddToast, onNavigate }: PublicComplaintFormProps) {
  const [formData, setFormData] = useState({
    category: "",
    title: "",
    description: "",
    wardNumber: "",
    citizenName: "",
    citizenContactNumber: "",
    preferredContactMethod: "Call" as "SMS" | "Email" | "Call" | "WhatsApp"
  });

  const [files, setFiles] = useState<File[]>([]);
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const convertFilesToBase64 = (filesToConvert: File[]): Promise<string[]> => {
    return Promise.all(
      filesToConvert.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim() || !formData.citizenName.trim() || !formData.citizenContactNumber.trim() || !formData.category || !formData.wardNumber) {
      onAddToast("Validation Error", "Please fill in all mandatory fields, including category and ward number.", "warning");
      return;
    }

    if (!pinCoords) {
      onAddToast("Location Required", "Please drop a pin", "warning");
      return;
    }

    setLoading(true);

    try {
      const generatedId = `COMP-${Date.now()}`;
      const nowIso = new Date().toISOString();
      const wardNum = parseInt(formData.wardNumber, 10) || 1;
      const wardObj = SEED_WARDS.find((w) => w.wardNumber === wardNum);

      let imageBase64List: string[] = [];
      if (files.length > 0) {
        imageBase64List = await convertFilesToBase64(files);
      }

      const complaintData: Complaint = {
        id: generatedId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        wardNumber: wardNum,
        wardName: wardObj ? wardObj.wardName : `Ward ${wardNum}`,
        reporterId: "PUBLIC",
        reporterName: formData.citizenName.trim(),
        status: "New",
        departmentId: null,
        departmentName: null,
        assignedTechnicianId: null,
        assignedTechnicianName: null,
        priority: "Medium",
        dateCreated: nowIso,
        dateUpdated: nowIso,
        logs: [
          {
            id: `log-${Date.now()}`,
            timestamp: nowIso,
            action: "Public Service Request Lodged",
            userName: formData.citizenName.trim(),
            userRole: "councillor",
            note: `Submitted publicly via Municipal Online Portal. Contact: ${formData.citizenContactNumber.trim()} (${formData.preferredContactMethod})`
          }
        ],
        comments: [],
        citizenName: formData.citizenName.trim(),
        citizenContactNumber: formData.citizenContactNumber.trim(),
        preferredContactMethod: formData.preferredContactMethod,
        gpsCoordinates: `${pinCoords.lat.toFixed(5)}, ${pinCoords.lng.toFixed(5)}`,
        supportingImages: imageBase64List
      };

      // Write to Firestore if connected
      if (isFirebaseEnabled && db) {
        await setDoc(doc(db, "complaints", generatedId), complaintData);
      }

      // Also save to local CRM database store for instant responsiveness
      const currentLocal = getComplaints();
      saveComplaints([complaintData, ...currentLocal]);
      window.dispatchEvent(new Event("thulamela_db_update"));

      setSubmittedId(generatedId);
      onAddToast(
        "Complaint Submitted Successfully",
        `Reference Number: ${generatedId}. Your issue has been registered with Thulamela Municipality.`,
        "success"
      );
    } catch (error) {
      console.error("Error submitting public complaint:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, "complaints");
      } catch (e) {
        // Ignored after logging
      }
      onAddToast("Submission Error", "Failed to submit complaint. Please check network connection.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedId(null);
    setFormData({
      category: "",
      title: "",
      description: "",
      wardNumber: "",
      citizenName: "",
      citizenContactNumber: "",
      preferredContactMethod: "Call"
    });
    setFiles([]);
    setPinCoords(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onAddToast("Copied to Clipboard", `Reference number ${text} copied.`, "info");
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-gov-yellow font-bold text-xs uppercase tracking-widest block">
          Service Delivery Portal
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight">
          Report a Public Issue
        </h1>
        <div className="w-16 h-1 bg-gov-green mx-auto"></div>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Log municipal service failures, infrastructure damage, water leaks, or power faults directly to Thulamela Local Municipality. You will receive an official tracking reference number.
        </p>
      </div>

      {submittedId ? (
        /* Prominent Success View displaying Reference Number */
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-lg p-8 sm:p-12 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Check size={44} className="stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Report Submitted Successfully
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto">
              Your service delivery complaint has been officially registered with Thulamela Local Municipality. Please save your reference number for status tracking and enquiries.
            </p>
          </div>

          {/* Prominent Reference Number Display Box */}
          <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl max-w-md mx-auto space-y-3 shadow-md border-2 border-gov-yellow">
            <p className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">
              Official Reference Tracking Number
            </p>
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl sm:text-4xl font-black font-mono text-gov-yellow tracking-wider select-all">
                {submittedId}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(submittedId)}
                title="Copy Reference Number"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700"
              >
                <Copy size={20} />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Keep this reference number safe to track progress or quote during call center enquiries (015 962 7500).
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleResetForm}
              className="w-full sm:w-auto px-6 py-3 bg-gov-green hover:bg-gov-green-hover text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2"
            >
              <FileText size={16} />
              <span>Submit Another Issue</span>
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate("home")}
                className="w-full sm:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center space-x-2"
              >
                <span>Return to Home</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Public Complaint Form */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-10 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            
            {/* Citizen Details Section */}
            <div className="space-y-4">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-2.5 flex items-center space-x-2">
                <User size={16} className="text-gov-green" />
                <span>1. Citizen Contact Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tendani Ndou"
                    value={formData.citizenName}
                    onChange={(e) => setFormData({ ...formData, citizenName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium text-base"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 072 123 4567"
                    value={formData.citizenContactNumber}
                    onChange={(e) => setFormData({ ...formData, citizenContactNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium font-mono text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Preferred Contact Method *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PREFERRED_CONTACT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormData({ ...formData, preferredContactMethod: method })}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition-all flex items-center justify-center space-x-2 ${
                        formData.preferredContactMethod === method
                          ? "bg-gov-green/10 border-gov-green text-gov-green shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <MessageSquare size={14} />
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Issue Details Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-2.5 flex items-center space-x-2">
                <Tag size={16} className="text-gov-blue" />
                <span>2. Issue Details & Ward</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Service Category *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-base"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Ward Number (1-41) *</label>
                  <select
                    required
                    value={formData.wardNumber}
                    onChange={(e) => setFormData({ ...formData, wardNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-base"
                  >
                    <option value="">Select ward</option>
                    {SEED_WARDS.map((w) => (
                      <option key={w.wardNumber} value={w.wardNumber}>
                        Ward {w.wardNumber} — {w.wardName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Issue Title / Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Major Water Pipe Burst on Main Street"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-base"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block">Detailed Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the issue, landmarks, severity, or length of disruption..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium text-base leading-relaxed"
                />
              </div>
            </div>

            {/* Location Pin Drop Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider flex items-center space-x-2">
                  <MapPin size={16} className="text-amber-600" />
                  <span>3. Location Pin-Drop *</span>
                </h3>
                {pinCoords && (
                  <span className="text-[11px] font-mono text-slate-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                    {pinCoords.lat.toFixed(5)}, {pinCoords.lng.toFixed(5)}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Click on the map to place a pin accurately marking the location of the service failure. You can drag the pin to adjust position.
              </p>

              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-inner h-64 relative bg-slate-100">
                {hasValidKey ? (
                  <APIProvider apiKey={API_KEY} version="weekly">
                    <Map
                      defaultCenter={{ lat: -22.9786, lng: 30.4578 }}
                      defaultZoom={13}
                      mapId="PUBLIC_COMPLAINT_MAP"
                      style={{ width: "100%", height: "100%" }}
                      mapTypeControl={true}
                      defaultMapTypeId="roadmap"
                      mapTypeControlOptions={{ position: ControlPosition.TOP_RIGHT }}
                      onClick={(e) => {
                        if (e.detail.latLng) {
                          setPinCoords({
                            lat: e.detail.latLng.lat,
                            lng: e.detail.latLng.lng
                          });
                        }
                      }}
                    >
                      {pinCoords && (
                        <AdvancedMarker
                          position={pinCoords}
                          draggable={true}
                          onDragEnd={(e) => {
                            const newLat = e.latLng?.lat() ?? (e as any).detail?.latLng?.lat;
                            const newLng = e.latLng?.lng() ?? (e as any).detail?.latLng?.lng;
                            if (newLat != null && newLng != null) {
                              setPinCoords({ lat: newLat, lng: newLng });
                            }
                          }}
                        >
                          <Pin background={"#004d25"} glyphColor={"#ffffff"} borderColor={"#000000"} />
                        </AdvancedMarker>
                      )}
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="h-full flex items-center justify-center bg-slate-100 text-xs text-slate-500 font-medium">
                    Map Setup Required
                  </div>
                )}
              </div>

              {pinCoords ? (
                <p className="text-xs font-semibold text-slate-700 flex items-center space-x-1.5 pt-1">
                  <MapPin size={14} className="text-gov-green flex-shrink-0" />
                  <span>Pinned location: {pinCoords.lat.toFixed(5)}, {pinCoords.lng.toFixed(5)}</span>
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic pt-1">
                  No pin placed yet. Click on the map above to drop a pin.
                </p>
              )}
            </div>

            {/* Supporting Photos Upload Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider border-b border-slate-100 pb-2.5 flex items-center space-x-2">
                <Building2 size={16} className="text-slate-600" />
                <span>4. Supporting Photographs (JPEG/PNG only)</span>
              </h3>

              <FileUploader
                files={files}
                setFiles={setFiles}
                maxFiles={5}
                maxSizeBytes={5 * 1024 * 1024}
                allowedTypes={['image/jpeg', 'image/png']}
                onAddToast={onAddToast}
              />
            </div>

            {/* Form Submit Button */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 bg-gov-green hover:bg-gov-green-hover text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Logging Service Request...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Service Complaint</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
