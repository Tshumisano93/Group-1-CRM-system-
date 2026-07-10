import React, { useState } from "react";
import { Mail, Phone, MapPin, Clock, ShieldAlert, Check, AlertCircle } from "lucide-react";

interface PublicContactProps {
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function PublicContact({ onAddToast }: PublicContactProps) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      onAddToast("Validation Error", "Please fill in all mandatory fields.", "warning");
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
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
    }, 1200);
  };

  const emergencyContacts = [
    { label: "Fire & Rescue (Vhembe Disaster Centre)", phone: "015 962 5351" },
    { label: "Ambulance / Emergency Medical", phone: "10177 / 015 962 4611" },
    { label: "South African Police Service (SAPS Thohoyandou)", phone: "015 960 1000 / 10111" },
    { label: "Municipal Disaster Management", phone: "080 020 4110" },
    { label: "Eskom Customer Care (Power Faults)", phone: "086 003 7566" }
  ];

  return (
    <div id="public-contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-gov-yellow font-bold text-xs uppercase tracking-widest block">Get in Touch</span>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Contact Us</h1>
        <div className="w-16 h-1 bg-gov-green mx-auto"></div>
        <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
          Need immediate service delivery feedback? Have questions regarding ward allocations? Fill in the feedback form or contact our civic centers directly. For municipal emergencies, use the dedicated hotlines.
        </p>
      </div>

      {/* Main Grid: Contact Details vs Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Contact info column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <h3 className="font-black text-slate-900 uppercase text-sm border-b border-slate-100 pb-2 tracking-wider">
              Municipal Civic Center
            </h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3.5 text-xs text-slate-600">
                <div className="bg-gov-green/10 p-2.5 rounded-xl text-gov-green flex-shrink-0 mt-0.5">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Physical Location</h4>
                  <p className="mt-0.5 leading-relaxed">
                    Thohoyandou Civic Centre, Old Mutual Building<br />
                    Mvudi Street, Thohoyandou, Limpopo, 0950
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 text-xs text-slate-600">
                <div className="bg-gov-blue/10 p-2.5 rounded-xl text-gov-blue flex-shrink-0 mt-0.5">
                  <Phone size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Call Centre Helpline</h4>
                  <p className="mt-0.5 font-mono">015 962 7500 / 015 962 4023</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 text-xs text-slate-600">
                <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-700 flex-shrink-0 mt-0.5">
                  <Mail size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Official Email</h4>
                  <p className="mt-0.5 font-mono">info@thulamela.gov.za</p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 text-xs text-slate-600">
                <div className="bg-amber-50 p-2.5 rounded-xl text-amber-700 flex-shrink-0 mt-0.5">
                  <Clock size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Official Operating Hours</h4>
                  <p className="mt-0.5 leading-relaxed">
                    Monday - Friday: 07:45 to 16:30<br />
                    Weekends & Public Holidays: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Helpline Box */}
          <div className="bg-red-50 border-l-4 border-red-600 rounded-2xl p-6 shadow-sm space-y-4">
            <h4 className="text-red-800 font-black uppercase text-xs tracking-wider flex items-center">
              <ShieldAlert size={16} className="mr-2 text-red-600 animate-pulse" />
              <span>Emergency Services Hotline</span>
            </h4>
            <div className="space-y-2 text-[11px] text-slate-700 leading-none">
              {emergencyContacts.map((contact, idx) => (
                <div key={idx} className="flex justify-between items-center border-b border-red-100/50 pb-2">
                  <span>{contact.label}</span>
                  <span className="font-bold text-red-700 font-mono text-xs">{contact.phone}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Feedback form column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="font-black text-slate-900 uppercase text-sm border-b border-slate-100 pb-2 tracking-wider">
            Public Inquiry & Feedback Form
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {success && (
              <div id="contact-success-banner" className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium font-mono"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Query Category</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-bold"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-medium leading-relaxed"
              ></textarea>
            </div>

            <button
              id="submit-contact-form"
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
      </div>

      {/* Google Maps Visual Placeholder */}
      <div id="maps-placeholder-section" className="bg-slate-100 rounded-2xl border border-slate-200 p-1.5 shadow-inner">
        <div className="relative bg-slate-200 h-80 rounded-xl overflow-hidden flex flex-col justify-center items-center text-center p-6 border border-slate-300">
          {/* Abstract Grid Roads map rendering */}
          <div className="absolute inset-0 opacity-15 bg-grid-pattern"></div>
          <div className="absolute top-1/4 left-1/3 w-1 h-32 bg-slate-500 transform rotate-12"></div>
          <div className="absolute top-1/3 left-1/4 w-96 h-1 bg-slate-500 transform -rotate-6"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-red-600 border-4 border-white flex items-center justify-center text-white shadow-lg animate-bounce">
            <MapPin size={14} className="fill-current" />
          </div>
          
          <div className="relative z-10 bg-white/95 backdrop-blur-sm p-5 rounded-2xl border border-slate-200 shadow-md max-w-sm">
            <h4 className="font-black text-xs uppercase text-slate-900 tracking-tight flex items-center justify-center">
              <MapPin size={14} className="mr-1 text-red-600" /> Vhembe Civic Precinct Map
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Google Maps integration placeholder. Real coordinates point to: <strong>Thohoyandou Civic Centre</strong>, located opposite the Venda Plaza shopping complex.
            </p>
            <span className="text-[9px] text-gov-blue font-mono mt-2 block font-bold">COORDINATES: 22.9786° S, 30.4598° E</span>
          </div>
        </div>
      </div>

    </div>
  );
}
