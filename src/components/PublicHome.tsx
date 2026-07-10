import React, { useState, useEffect } from "react";
import { 
  getComplaints, 
  getAnnouncements, 
  getWards, 
  getUsers 
} from "../db";
import { 
  Search, 
  ArrowRight, 
  PhoneCall, 
  MapPin, 
  CheckCircle, 
  Clock, 
  FileText, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  Users, 
  Percent, 
  Layers 
} from "lucide-react";

interface PublicHomeProps {
  onNavigate: (view: string) => void;
}

export default function PublicHome({ onNavigate }: PublicHomeProps) {
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [activeCouncillors, setActiveCouncillors] = useState(3); // seeded cllrs
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<string | null>(null);

  useEffect(() => {
    const complaints = getComplaints();
    setComplaintsCount(complaints.length);
    setResolvedCount(complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length);
    
    const users = getUsers();
    setActiveCouncillors(users.filter(u => u.role === "councillor" && u.status === "active").length);
  }, []);

  const announcements = getAnnouncements();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    const term = searchQuery.toLowerCase();
    if (term.includes("water") || term.includes("borehole")) {
      setSearchResult("Search Results Found: 1 active Water Supply announcement found: 'Urgent: Water Conservation Notice'. All water issues in Ward 1 (Makwarela) are currently being dispatched to technicians.");
    } else if (term.includes("pothole") || term.includes("road")) {
      setSearchResult("Search Results Found: 1 active Road issue lodged in Sibasa (Ward 2). General municipal maintenance is scheduled for Tuesday mornings.");
    } else if (term.includes("cllr") || term.includes("councillor")) {
      setSearchResult("Search Results Found: Primary Ward Councillors are registered for Ward 1 (Makwarela), Ward 2 (Sibasa), and Ward 5 (Maniini). Log in as councillor to manage respective wards.");
    } else {
      setSearchResult(`No specific emergency notices found for "${searchQuery}". For immediate assistance, please dial the Customer Care Hotline: 015 962 7500.`);
    }
  };

  return (
    <div id="public-home" className="space-y-12 bg-[#F8F9FA]">
      {/* 1. Hero and Side Panel Split Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col lg:flex-row items-stretch">
          {/* Left Column: Hero Content */}
          <div className="w-full lg:w-7/12 p-8 lg:p-12 flex flex-col justify-center space-y-6 bg-white">
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
            <form onSubmit={handleSearch} className="pt-4 max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search emergency notices, wards, or updates... (e.g., Water, Roads)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-200 text-slate-900 rounded-xl py-3.5 pl-12 pr-28 text-xs focus:outline-none focus:border-gov-green placeholder-slate-400 font-medium shadow-sm"
                />
                <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                <button
                  type="submit"
                  className="absolute right-2 top-2 bg-gov-green hover:bg-gov-green-hover text-white font-bold uppercase tracking-wider text-[10px] px-4 py-2 rounded-lg transition-all"
                >
                  Search
                </button>
              </div>
              
              {searchResult && (
                <div id="search-results-panel" className="mt-3 bg-gov-blue/5 border border-gov-blue/20 text-slate-800 text-xs p-4 rounded-xl leading-relaxed shadow-sm font-medium animate-fadeIn">
                  {searchResult}
                  <button 
                    onClick={() => setSearchResult(null)} 
                    className="block text-gov-blue font-bold mt-1.5 hover:underline text-[10px] uppercase tracking-wider"
                  >
                    Clear Search
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Right Column: SIDE PANEL: STATS & SERVICES */}
          <div className="w-full lg:w-5/12 bg-slate-50 p-8 flex flex-col gap-6 border-t lg:border-t-0 lg:border-l border-slate-200">
            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-gov-green">
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

            {/* SERVICE QUICK LINKS */}
            <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center">
                  <span className="w-2.5 h-5 bg-gov-yellow mr-2 rounded-sm"></span>
                  Priority Services
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm mr-3">🚰</div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Water Supply</p></div>
                    <button onClick={() => onNavigate("services")} className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                  <div className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-sm mr-3">💡</div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Electricity & Grid</p></div>
                    <button onClick={() => onNavigate("services")} className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                  <div className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-sm mr-3">🛣️</div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Roads Maintenance</p></div>
                    <button onClick={() => onNavigate("services")} className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                  <div className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm mr-3">♻️</div>
                    <div className="flex-1"><p className="text-xs font-bold text-slate-800">Waste Logistics</p></div>
                    <button onClick={() => onNavigate("services")} className="text-[10px] font-bold text-gov-blue hover:underline">View SLA</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Notice Strip / Emergency Banner */}
      <div id="emergency-banner" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 md:space-x-6 border border-slate-800 shadow-sm">
          <div className="flex items-center space-x-3 flex-1 text-left">
            <span className="bg-red-600 text-[10px] font-black px-2.5 py-1 rounded uppercase animate-pulse shrink-0">Urgent Notice</span>
            <p className="text-xs font-medium text-slate-300 leading-relaxed italic">
              Water maintenance scheduled for Ward 12 and 15 on Wednesday from 08:00 - 17:00. High-usage restriction bylaws are in active enforcement.
            </p>
          </div>
          <div className="flex items-center space-x-4 shrink-0">
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

      {/* 3. News, Announcements & Community Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  onClick={() => onNavigate("contact")}
                  className="w-full text-left bg-white border border-slate-200 px-3.5 py-3 rounded-xl text-xs font-bold text-slate-700 hover:text-gov-blue hover:border-gov-blue hover:shadow-sm flex items-center justify-between transition-all"
                >
                  <span>Submit Public Feedback</span>
                  <ArrowRight size={14} className="text-slate-400" />
                </button>
              </div>
            </div>

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
    </div>
  );
}
