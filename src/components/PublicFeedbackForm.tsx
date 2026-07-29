import React, { useState } from "react";
import { Check } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, isFirebaseEnabled } from "../firebase";
import { handleFirestoreError, OperationType } from "../db";

interface PublicFeedbackFormProps {
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function PublicFeedbackForm({ onAddToast }: PublicFeedbackFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    wardNumber: "",
    subject: "Service Inquiry",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      onAddToast("Validation Error", "Please fill in all mandatory fields.", "warning");
      return;
    }

    setLoading(true);
    try {
      if (isFirebaseEnabled && db) {
        await addDoc(collection(db, "publicInquiries"), {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          wardNumber: formData.wardNumber,
          subject: formData.subject,
          message: formData.message,
          submittedAt: serverTimestamp()
        });
      }

      setSuccess(true);
      onAddToast(
        "Feedback Submitted Successfully",
        "Thank you! Your feedback has been logged in our public inquiries register. A customer care officer will review it.",
        "success"
      );
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        wardNumber: "",
        subject: "Service Inquiry",
        message: ""
      });
    } catch (error) {
      console.error("Error writing to publicInquiries collection:", error);
      try {
        handleFirestoreError(error, OperationType.WRITE, "publicInquiries");
      } catch (e) {
        // Ignored after logging
      }
      onAddToast("Submission Error", "Failed to log feedback inquiry. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
      <h3 className="font-black text-slate-900 uppercase text-sm border-b border-slate-100 pb-2 tracking-wider">
        Public Inquiry & Feedback Form
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2">
            <Check size={18} className="text-emerald-600" />
            <span>Your query has been recorded. Our support team will get in touch shortly.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Your Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Tendani Ndou"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium text-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Your Email Address *</label>
            <input
              type="email"
              required
              placeholder="e.g. tendani@gmail.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Phone Number (Optional)</label>
            <input
              type="tel"
              placeholder="e.g. 072 123 4567"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium font-mono text-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Ward Number (1-41) if applicable</label>
            <input
              type="number"
              min="1"
              max="41"
              placeholder="e.g. 1"
              value={formData.wardNumber}
              onChange={(e) => setFormData({ ...formData, wardNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium font-mono text-base"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">Query Category</label>
          <select
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold text-base"
          >
            <option value="Service Inquiry">General Service Inquiry</option>
            <option value="Billing / Rates">Billing and Rates Queries</option>
            <option value="Ward Cllr Contacts">Ward Councillor Contacts</option>
            <option value="Municipality Projects">Municipal Projects & Tenders</option>
            <option value="CRM System Support">CRM Digital System Technical Support</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-700 block">Your Message *</label>
          <textarea
            required
            rows={5}
            placeholder="Type your feedback or service delivery message here..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium leading-relaxed text-base"
          ></textarea>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gov-green hover:bg-gov-green-hover text-white font-bold py-3.5 px-6 rounded-xl shadow-md uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span>Send Feedback Message</span>
          )}
        </button>
      </form>
    </div>
  );
}
