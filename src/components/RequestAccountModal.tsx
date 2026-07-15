import React, { useState } from "react";
import { X, Send, User, Mail, Phone, MapPin, Briefcase, CreditCard } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db, isFirebaseEnabled } from "../firebase";

interface RequestAccountModalProps {
  onClose: () => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function RequestAccountModal({ onClose, onAddToast }: RequestAccountModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    wardNumber: "",
    politicalPosition: "",
    saIdNumber: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseEnabled) {
      onAddToast("Error", "Firebase is not enabled.", "error");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "accountRequests"), {
        ...formData,
        wardNumber: Number(formData.wardNumber),
        status: "pending",
        dateRequested: new Date().toISOString(),
      });
      onAddToast("Request Sent", "Your account request has been submitted to the Super Administrator.", "success");
      onClose();
    } catch (error) {
      console.error(error);
      onAddToast("Error", "Failed to submit request.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Request New Account</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <input type="text" placeholder="Full Name" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-base" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <input type="email" placeholder="Email" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-base" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
          <input type="tel" placeholder="Phone" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-base" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required />
          <input type="number" placeholder="Ward Number" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-base" value={formData.wardNumber} onChange={e => setFormData({...formData, wardNumber: e.target.value})} required />
          <input type="text" placeholder="Political Position" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-base" value={formData.politicalPosition} onChange={e => setFormData({...formData, politicalPosition: e.target.value})} required />
          <input type="text" placeholder="SA ID Number" className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-base" value={formData.saIdNumber} onChange={e => setFormData({...formData, saIdNumber: e.target.value})} required />
          <button type="submit" disabled={loading} className="w-full bg-gov-green hover:bg-gov-green-hover text-white font-bold py-2 rounded-lg transition-all">
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
