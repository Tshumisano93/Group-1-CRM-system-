import React, { useState, useEffect } from "react";
import { 
  getDocuments, 
  saveDocuments, 
  addAuditLog 
} from "../db";
import { MunicipalDocument, User } from "../types";
import { 
  Folder, 
  File, 
  Search, 
  Download, 
  Plus, 
  Filter, 
  Trash2, 
  History, 
  Info,
  Calendar,
  Lock,
  RefreshCw,
  FileText
} from "lucide-react";

interface DocumentManagerProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function DocumentManager({ currentUser, onAddToast }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<MunicipalDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Form states to upload document
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<MunicipalDocument["category"]>("policies");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("pdf");

  // Detailed modal inspector
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const loadDocs = () => {
    setDocuments(getDocuments());
  };

  useEffect(() => {
    loadDocs();
    window.addEventListener("thulamela_db_update", loadDocs);
    return () => window.removeEventListener("thulamela_db_update", loadDocs);
  }, []);

  // Filter documents
  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          d.uploadedByName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "All" || d.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Handle uploading document
  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      onAddToast("Validation Alert", "Please specify a document title and the secure resource URL.", "warning");
      return;
    }

    const allDocs = getDocuments();
    const docId = `doc-${Date.now()}`;

    const newDocObj: MunicipalDocument = {
      id: docId,
      title: newTitle.trim(),
      category: newCategory,
      fileUrl: newUrl.trim(),
      fileType: newType,
      fileSize: "1.2 MB", // Simulated file calculation
      version: 1,
      uploadedBy: currentUser.id,
      uploadedByName: currentUser.name,
      uploadedDate: new Date().toISOString(),
      history: [
        { version: 1, fileUrl: newUrl.trim(), date: new Date().toISOString(), updatedBy: currentUser.name }
      ]
    };

    allDocs.unshift(newDocObj);
    saveDocuments(allDocs);
    setDocuments(allDocs);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Upload Document",
      `Uploaded document ${newDocObj.title} into category ${newCategory}`
    );

    onAddToast("Document Uploaded", `Document file '${newTitle}' successfully committed to version control repository.`, "success");

    // Reset Form
    setNewTitle("");
    setNewUrl("");
    setShowUploadForm(false);
  };

  // Handle document deletion
  const handleDeleteDoc = (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentUser.role !== "super_admin" && currentUser.role !== "municipal_admin") {
      onAddToast("Admin Privileges Required", "Only municipal administrators can delete secure document assets.", "error");
      return;
    }

    const allDocs = getDocuments();
    const targetDoc = allDocs.find(d => d.id === docId);
    const updated = allDocs.filter(d => d.id !== docId);
    
    saveDocuments(updated);
    setDocuments(updated);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Delete Document",
      `Removed document ${targetDoc?.title || docId}`
    );

    onAddToast("Document Deleted", "The repository asset has been deleted successfully.", "info");
    setSelectedDocId(null);
  };

  // Secure download with audit trail
  const handleSecureDownload = (doc: MunicipalDocument) => {
    onAddToast("Secure Download Triggered", `Downloading: ${doc.title}. An audit log entry has been registered for compliance reporting.`, "success");
    
    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Download Document",
      `Downloaded document '${doc.title}' (version v${doc.version})`
    );

    if (doc.fileUrl) {
      const link = document.createElement("a");
      link.href = doc.fileUrl;
      link.download = doc.title || "document";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Update/Upload a new version
  const handleUploadNewVersion = (docId: string, url: string) => {
    if (!url.trim()) return;

    const allDocs = getDocuments();
    const doc = allDocs.find(d => d.id === docId);
    if (!doc) return;

    const nextVer = doc.version + 1;

    const updated = allDocs.map(d => {
      if (d.id === docId) {
        const historyObj = d.history || [];
        const newHist = [
          ...historyObj,
          { version: nextVer, fileUrl: url.trim(), date: new Date().toISOString(), updatedBy: currentUser.name }
        ];

        return {
          ...d,
          version: nextVer,
          fileUrl: url.trim(),
          uploadedDate: new Date().toISOString(),
          history: newHist
        };
      }
      return d;
    });

    saveDocuments(updated);
    setDocuments(updated);

    addAuditLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      "Version Document",
      `Updated document ${docId} to version ${nextVer}`
    );

    onAddToast("Version Upgraded", `Document updated to v${nextVer} successfully.`, "success");
  };

  const getCategoryLabel = (cat: MunicipalDocument["category"]) => {
    switch (cat) {
      case "complaint_docs": return "Complaint Attachments";
      case "reports": return "Audit & Monthly Reports";
      case "policies": return "Municipal Policies & IDP";
      case "minutes": return "Council Minutes";
      case "contracts": return "Procurement Contracts";
      case "inspections": return "Inspections Records";
      case "certificates": return "Staff Certifications";
      case "training": return "SOPs & Training Manuals";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-6">
      
      {/* 1. Header toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 space-y-4 sm:space-y-0">
        <div>
          <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest flex items-center">
            <Folder className="mr-2 text-gov-green" size={18} />
            <span>Document Repository & Compliance</span>
          </h3>
          <p className="text-[10px] text-slate-500">Access official municipal guidelines, Integrated Development Plans (IDP), Council minutes, and training material.</p>
        </div>

        {/* Action Button */}
        <div className="flex space-x-2">
          {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="flex items-center space-x-1.5 px-3 py-2 bg-gov-green hover:bg-gov-green-hover text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-gov-green/10"
            >
              <Plus size={12} />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Upload Document Form */}
      {showUploadForm && (
        <form onSubmit={handleUploadDoc} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="md:col-span-3 border-b border-slate-200 pb-2">
            <h4 className="font-black uppercase text-[11px] text-slate-800">Publish Regulatory Document</h4>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Document Title *</label>
            <input
              type="text"
              placeholder="e.g. Ward Waste Management Guideline"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-base"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Category *</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as MunicipalDocument["category"])}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-bold text-slate-700 text-base"
            >
              <option value="policies">Municipal Policies & IDP</option>
              <option value="training">SOPs & Training Manuals</option>
              <option value="reports">Audit & Monthly Reports</option>
              <option value="minutes">Council Minutes</option>
              <option value="contracts">Procurement Contracts</option>
              <option value="inspections">Inspections Records</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Secure Repository URL *</label>
            <input
              type="text"
              placeholder="https://www.thulamela.gov.za/docs/file.pdf"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none font-mono text-base"
              required
            />
          </div>

          <div className="md:col-span-3 flex justify-end space-x-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold shadow"
            >
              Publish Document Asset
            </button>
          </div>
        </form>
      )}

      {/* 3. Filtering and Search */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-start md:items-center text-xs">
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          <Filter size={14} className="text-gov-blue" />
          <span className="font-bold uppercase tracking-wide text-slate-700 text-[10px]">Filter Documents:</span>
        </div>

        {/* Search */}
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder="Search document names, authors, version logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold focus:outline-none text-base"
          />
          <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
        </div>

        {/* Categories */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none font-bold text-slate-700 text-base"
        >
          <option value="All">All Categories</option>
          <option value="policies">Policies & IDP</option>
          <option value="training">Training & SOPs</option>
          <option value="reports">Audit & Reports</option>
          <option value="minutes">Minutes</option>
          <option value="contracts">Contracts</option>
          <option value="inspections">Inspections</option>
        </select>
      </div>

      {/* 4. Display of document list vs detailed modal inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Document rows */}
        <div className="lg:col-span-8 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              No municipal documents found in this directory.
            </div>
          ) : (
            filteredDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 ${
                  selectedDocId === doc.id 
                    ? "bg-slate-50 border-gov-green" 
                    : "bg-white border-slate-100 hover:bg-slate-50/40"
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl flex-shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-mono bg-gov-blue/5 text-gov-blue font-bold px-1.5 py-0.5 rounded">
                      v{doc.version}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[320px] mt-1">
                      {doc.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Category: {getCategoryLabel(doc.category)} • Size: {doc.fileSize}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSecureDownload(doc);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg hover:text-slate-900 transition-colors"
                    title="Download document with compliance audit tracking"
                  >
                    <Download size={13} />
                  </button>
                  
                  {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
                    <button
                      onClick={(e) => handleDeleteDoc(doc.id, e)}
                      className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Archive asset"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: Detailed inspector & Version History */}
        <div className="lg:col-span-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-4">
          {selectedDocId ? (
            (() => {
              const doc = documents.find(d => d.id === selectedDocId);
              if (!doc) return null;

              return (
                <div className="space-y-4 text-xs leading-normal">
                  <div className="border-b border-slate-200 pb-2">
                    <h4 className="font-black text-slate-900 uppercase">Document Information</h4>
                    <span className="text-[9px] text-slate-400 font-mono">Reference: {doc.id}</span>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-800 uppercase">{doc.title}</h5>
                    <span className="block text-[10px] text-gov-blue font-bold">{getCategoryLabel(doc.category)}</span>
                  </div>

                  <div className="bg-white border border-slate-100 p-3.5 rounded-xl space-y-2 font-mono text-[10px] text-slate-500">
                    <div className="flex justify-between">
                      <span>Publish Date:</span>
                      <span className="text-slate-800">{new Date(doc.uploadedDate).toLocaleDateString("en-ZA")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uploaded By:</span>
                      <span className="text-slate-800 font-sans font-bold">{doc.uploadedByName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Version:</span>
                      <span className="text-gov-green font-bold">v{doc.version}</span>
                    </div>
                  </div>

                  {/* Version history stack */}
                  <div className="space-y-2">
                    <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest flex items-center">
                      <History size={12} className="mr-1 text-gov-blue" />
                      <span>Version control history ({doc.history?.length || 1})</span>
                    </span>

                    <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                      {doc.history?.map((h, hIdx) => (
                        <div key={hIdx} className="bg-white p-2 border border-slate-200/60 rounded-lg text-[9px] flex justify-between items-center">
                          <div>
                            <span className="font-bold font-mono text-gov-blue">v{h.version}</span>
                            <span className="block text-slate-400 mt-0.5 font-mono">Modified: {new Date(h.date).toLocaleDateString("en-ZA")}</span>
                          </div>
                          <span className="font-bold text-slate-600">By: {h.updatedBy.split(" ").slice(-1)[0]}</span>
                        </div>
                      ))}
                    </div>

                    {/* Simulating uploading newer version */}
                    {(currentUser.role === "super_admin" || currentUser.role === "municipal_admin") && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center space-x-1">
                        <button
                          onClick={() => handleUploadNewVersion(doc.id, "https://www.thulamela.gov.za/updated_sop.pdf")}
                          className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-[9px] uppercase hover:bg-slate-800 flex items-center justify-center space-x-1 shadow-sm"
                        >
                          <RefreshCw size={11} className="animate-spin-slow" />
                          <span>Commit New Version</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Folder size={28} className="opacity-30 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider text-center">Inspect compliance assets</p>
              <p className="text-[10px] mt-1 text-center">Select any published PDF document to review compliance logs, audit version upgrades, or download secure assets.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
