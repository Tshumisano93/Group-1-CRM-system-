import React, { useState, useEffect } from "react";
import { 
  getDigitalForms, 
  saveDigitalForms, 
  addAuditLog 
} from "../db";
import { DigitalForm, User } from "../types";
import { 
  FileText, 
  Clipboard, 
  Check, 
  Plus, 
  Send, 
  Trash2, 
  Locate, 
  Signature, 
  Save, 
  Search,
  Eye,
  Info
} from "lucide-react";

interface DigitalFormsProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function DigitalForms({ currentUser, onAddToast }: DigitalFormsProps) {
  const [forms, setForms] = useState<DigitalForm[]>([]);
  const [activeFormType, setActiveFormType] = useState<"site_visit" | "completion" | "checklist">("site_visit");
  const [searchQuery, setSearchQuery] = useState("");

  // Site Visit Fields
  const [inspector, setInspector] = useState(currentUser.name);
  const [siteLocation, setSiteLocation] = useState("");
  const [materialsUsed, setMaterialsUsed] = useState("");
  const [laborHours, setLaborHours] = useState("");
  const [leakSeverity, setLeakSeverity] = useState("Medium");

  // Completion Fields
  const [completionDate, setCompletionDate] = useState("2026-07-10");
  const [satisfactionScore, setSatisfactionScore] = useState("5");
  const [rectificationRequired, setRectificationRequired] = useState(false);
  const [technicianNotes, setTechnicianNotes] = useState("");

  // Signature and GPS
  const [electronicSignature, setElectronicSignature] = useState("");
  const [capturedGps, setCapturedGps] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  // Detail viewing
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const loadForms = () => {
    setForms(getDigitalForms());
  };

  useEffect(() => {
    loadForms();
    window.addEventListener("thulamela_db_update", loadForms);
    return () => window.removeEventListener("thulamela_db_update", loadForms);
  }, []);

  // Trigger simulated GPS Capture
  const handleCaptureGps = () => {
    setIsLocating(true);
    setTimeout(() => {
      const mockGps = `-22.${Math.floor(Math.random() * 9000) + 1000}, 30.${Math.floor(Math.random() * 9000) + 1000}`;
      setCapturedGps(mockGps);
      setIsLocating(false);
      onAddToast("GPS coordinates Captured", `Simulated latitude and longitude recorded successfully: ${mockGps}`, "success");
    }, 1500);
  };

  // Submit dynamic form
  const handleSubmitForm = (e: React.FormEvent, isDraftFlag: boolean = false) => {
    e.preventDefault();
    
    if (!electronicSignature.trim() && !isDraftFlag) {
      onAddToast("Signature Required", "Please type your full name in the signature block to certify compliance.", "warning");
      return;
    }

    const allForms = getDigitalForms();
    const formId = `form-${Date.now()}`;

    // construct form data based on type
    let data: any = {};
    let title = "";
    if (activeFormType === "site_visit") {
      title = `Site Inspection Visit: ${siteLocation || "Thulamela Site"}`;
      data = { inspector, siteLocation, materialsUsed, laborHours, leakSeverity };
    } else if (activeFormType === "completion") {
      title = `Completion Handover Certificate: ${siteLocation || "Infrastructure Job"}`;
      data = { completionDate, satisfactionScore, rectificationRequired, technicianNotes };
    } else {
      title = `SOP Safety Compliance Checklist`;
      data = { safetyChecked: true, toolsCalibrated: true, municipalSopAcknowledged: true };
    }

    const newFormObj: DigitalForm = {
      id: formId,
      type: activeFormType,
      title,
      formData: data,
      signature: electronicSignature || undefined,
      gpsCoordinates: capturedGps || "-22.9567, 30.4812",
      submittedBy: currentUser.id,
      submittedByName: currentUser.name,
      date: new Date().toISOString(),
      isDraft: isDraftFlag
    };

    allForms.unshift(newFormObj);
    saveDigitalForms(allForms);
    setForms(allForms);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      isDraftFlag ? "Save Form Draft" : "Submit Compliance Form",
      `Saved compliance form ${formId} (${isDraftFlag ? "Draft" : "Submitted"}) regarding '${title}'`
    );

    onAddToast(
      isDraftFlag ? "Draft Stored" : "Form Certified & Submitted",
      isDraftFlag 
        ? "Form successfully queued inside local draft workspace." 
        : "Form signed off, locked, and published to compliance registers.",
      "success"
    );

    // Reset Form states
    setSiteLocation("");
    setMaterialsUsed("");
    setLaborHours("");
    setTechnicianNotes("");
    setElectronicSignature("");
    setCapturedGps("");
  };

  // Delete Form
  const handleDeleteForm = (id: string) => {
    if (currentUser.role !== "super_admin" && currentUser.role !== "municipal_admin") {
      onAddToast("Access Denied", "Only administrators can remove audited compliance certificates.", "error");
      return;
    }

    const allForms = getDigitalForms();
    const updated = allForms.filter(f => f.id !== id);
    saveDigitalForms(updated);
    setForms(updated);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Delete Compliance Form",
      `Removed compliance form reference ${id}`
    );

    onAddToast("Form Removed", "Audit form successfully purged.", "info");
    setSelectedFormId(null);
  };

  const filteredForms = forms.filter(f => {
    return f.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
           f.submittedByName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-6 text-xs">
      
      {/* 1. Header toolbar */}
      <div className="border-b border-slate-100 pb-4">
        <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center">
          <FileText className="mr-2 text-gov-green" size={18} />
          <span>Interactive Municipal Sign-off Forms</span>
        </h3>
        <p className="text-[10px] text-slate-500">File and sign official site diagnostics, safety checklists, and completion sign-off certificates with GPS tracking.</p>
      </div>

      {/* 2. Main split: Fill form on left vs Display of filed forms on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Interactive Form builder */}
        <div className="lg:col-span-7 bg-slate-50/50 p-5 rounded-2xl border border-slate-150 space-y-4">
          
          {/* Form Selector Tabs */}
          <div className="flex items-center space-x-1 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveFormType("site_visit")}
              className={`px-3 py-1.5 font-bold uppercase text-[9px] rounded-lg transition-all ${activeFormType === "site_visit" ? "bg-gov-blue text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Site Visit Log
            </button>
            <button
              onClick={() => setActiveFormType("completion")}
              className={`px-3 py-1.5 font-bold uppercase text-[9px] rounded-lg transition-all ${activeFormType === "completion" ? "bg-gov-blue text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              Completion Certificate
            </button>
          </div>

          <form onSubmit={(e) => handleSubmitForm(e, false)} className="space-y-4 text-xs">
            
            {/* SITE INSPECTION FORM */}
            {activeFormType === "site_visit" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Inspector Name</label>
                  <input
                    type="text"
                    value={inspector}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-bold cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Site Location / Ward Ref *</label>
                  <input
                    type="text"
                    placeholder="e.g. Makwarela Block F Reservoir"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Leak Severity Rating</label>
                  <select
                    value={leakSeverity}
                    onChange={(e) => setLeakSeverity(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="Low">Low (Minor Weeping)</option>
                    <option value="Medium">Medium (Active Drip)</option>
                    <option value="Severe">Severe (Major Burst Flow)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Labor Hours Expended</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.5 Hours"
                    value={laborHours}
                    onChange={(e) => setLaborHours(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700 block">Materials/Spares Utilized</label>
                  <input
                    type="text"
                    placeholder="e.g. 110mm PVC pipe coupler, pipe sealing adhesive, 2 gaskets"
                    value={materialsUsed}
                    onChange={(e) => setMaterialsUsed(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* COMPLETION HANDOVER CERTIFICATE */}
            {activeFormType === "completion" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Site Location / Job Ref *</label>
                  <input
                    type="text"
                    placeholder="e.g. Transformer Box Substation 12"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Completion Date *</label>
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none font-bold text-slate-700"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Citizen Satisfaction Score (CSAT)</label>
                  <select
                    value={satisfactionScore}
                    onChange={(e) => setSatisfactionScore(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none font-bold text-slate-700"
                  >
                    <option value="5">5/5 - Highly Satisfied</option>
                    <option value="4">4/5 - Satisfied</option>
                    <option value="3">3/5 - Neutral</option>
                    <option value="2">2/5 - Unsatisfied</option>
                    <option value="1">1/5 - Extremely Unsatisfied</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 pt-5">
                  <input
                    type="checkbox"
                    id="rect-req"
                    checked={rectificationRequired}
                    onChange={(e) => setRectificationRequired(e.target.checked)}
                    className="w-4 h-4 text-gov-green focus:ring-gov-green accent-gov-green"
                  />
                  <label htmlFor="rect-req" className="font-bold text-slate-700">Follow-up Rectification Needed?</label>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="font-bold text-slate-700 block">SOP Engineering Notes</label>
                  <textarea
                    placeholder="Provide diagnostic readings, pressure metrics, or site cleanup confirmation remarks..."
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 h-14 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* GPS AND SIGNATURE BLOCK */}
            <div className="pt-4 border-t border-slate-200 space-y-3.5">
              <span className="font-black text-[9px] uppercase tracking-wider text-slate-400 block">Certification & Location Sign-off</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* GPS Capture */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Telemetry GPS Lock *</label>
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      disabled
                      placeholder="Coordinates not locked"
                      value={capturedGps}
                      className="flex-grow bg-slate-100 border border-slate-200 rounded-lg p-2 font-mono text-[10px] font-bold text-gov-blue cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={handleCaptureGps}
                      disabled={isLocating}
                      className="px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center justify-center"
                      title="Geolocate Active Site"
                    >
                      <Locate size={14} className={isLocating ? "animate-spin text-gov-yellow" : ""} />
                    </button>
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 block">Electronic Signature *</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Type Full Name to Certify"
                      value={electronicSignature}
                      onChange={(e) => setElectronicSignature(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 pl-8 focus:outline-none font-sans italic font-bold text-slate-800"
                      required
                    />
                    <Signature className="absolute left-2.5 top-2.5 text-slate-400" size={13} />
                  </div>
                </div>

              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={(e) => handleSubmitForm(e, true)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-100 flex items-center space-x-1"
              >
                <Save size={13} />
                <span>Save Draft</span>
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-gov-green hover:bg-gov-green-hover text-white rounded-lg font-bold shadow flex items-center space-x-1"
              >
                <Send size={13} />
                <span>Sign & Submit audited Form</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right: List of submitted compliance forms */}
        <div className="lg:col-span-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-black text-xs text-slate-900 uppercase">Filed Certificates</span>
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded uppercase">Audited</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search compliance forms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <Search className="absolute left-3 top-2 text-slate-400" size={12} />
            </div>

            {/* Scroll list */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {filteredForms.length === 0 ? (
                <p className="text-[10px] text-slate-400 text-center py-4 italic">No filed certificates logged.</p>
              ) : (
                filteredForms.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFormId(f.id)}
                    className="p-2.5 rounded-lg border border-slate-150 bg-white hover:bg-slate-100 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-slate-800 text-[10px] uppercase truncate max-w-[170px]">{f.title}</h4>
                      <span className="text-[8px] font-mono block text-slate-400 mt-0.5">By: {f.submittedByName} • Date: {new Date(f.date).toLocaleDateString("en-ZA")}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 flex-shrink-0">
                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded uppercase ${f.isDraft ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>
                        {f.isDraft ? "Draft" : "Audited"}
                      </span>
                      
                      {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteForm(f.id);
                          }}
                          className="p-1 hover:bg-red-50 text-red-500 rounded"
                          title="Purge Audit"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expanded modal / display details of form */}
          <div className="pt-4 border-t border-slate-200/60 mt-4 text-[10px] text-slate-500 font-medium">
            {selectedFormId ? (
              (() => {
                const form = forms.find(f => f.id === selectedFormId);
                if (!form) return null;

                return (
                  <div className="bg-white p-3 rounded-xl border border-slate-150 space-y-2.5 leading-normal">
                    <div className="flex justify-between font-bold border-b border-slate-100 pb-1">
                      <span className="text-slate-800 uppercase text-[9px]">{form.type.replace("_", " ")}</span>
                      <span className="font-mono text-slate-400 text-[8px]">{form.id}</span>
                    </div>

                    <h5 className="font-bold text-slate-900 uppercase text-[10px]">{form.title}</h5>
                    
                    <div className="space-y-1 font-mono text-[9px] text-slate-600">
                      {Object.entries(form.formData).map(([key, val]: [string, any]) => (
                        <div key={key} className="flex justify-between">
                          <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}:</span>
                          <span className="font-bold text-slate-800">{String(val)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] font-sans">
                      <span className="font-bold text-slate-700">GPS Locked:</span>
                      <span className="font-mono text-gov-blue">{form.gpsCoordinates}</span>
                    </div>

                    {form.signature && (
                      <div className="pt-1 flex justify-between items-center text-[9px] font-sans">
                        <span className="font-bold text-slate-700">Digital Signee:</span>
                        <span className="italic font-bold text-slate-900 underline">{form.signature}</span>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className="text-center italic opacity-60">
                Click a filed certificate to inspect its secure electronic sign-off and GPS tracking record.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
