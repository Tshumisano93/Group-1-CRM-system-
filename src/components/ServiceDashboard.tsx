import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, AlertCircle, Clock, Users, CheckCircle, FileText, Bell, Phone, Mail } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { getServiceNotices } from "../db";
import { ServiceNotice } from "../types";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

export default function ServiceDashboard() {
  const { category } = useParams<{ category: string }>();
  const navigate = useNavigate();
  const [notices, setNotices] = useState<ServiceNotice[]>([]);

  useEffect(() => {
    setNotices(getServiceNotices());
    const handleUpdate = () => setNotices(getServiceNotices());
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  const serviceNotices = notices.filter(n => n.category.toLowerCase() === category?.toLowerCase());
  const activeNotice = serviceNotices[0]; // Assuming one main notice per service for prototype

  if (!activeNotice) return <div className="p-12 text-center">Service dashboard not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-slate-600 font-bold text-sm hover:text-gov-blue">
        <ArrowLeft size={16} className="mr-2" /> Back
      </button>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gov-blue/10 rounded-xl text-gov-blue">
            <AlertCircle size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">{activeNotice.title}</h1>
            <p className="text-sm text-slate-500">Status: <span className="font-bold text-amber-600">{activeNotice.status}</span> • Last Updated: {new Date(activeNotice.dateReported).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500">Active Incidents</p><p className="font-black text-slate-900 text-xl">{serviceNotices.length}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500">Affected Wards</p><p className="font-black text-slate-900 text-xl">{activeNotice.affectedWards.length}</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500">Technicians</p><p className="font-black text-slate-900 text-xl">8</p></div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500">Completion</p><p className="font-black text-slate-900 text-xl">{activeNotice.estimatedCompletion}</p></div>
      </div>

      {/* Map & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-96">
          {hasValidKey ? (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map defaultCenter={{lat: -22.95, lng: 30.48}} defaultZoom={12} mapId="DEMO_MAP_ID" style={{width: '100%', height: '100%'}}>
                 <AdvancedMarker position={{lat: -22.95, lng: 30.48}}><Pin background="#EF4444" /></AdvancedMarker>
              </Map>
            </APIProvider>
          ) : <div className="h-full flex items-center justify-center bg-slate-100 text-xs">Map Setup Required</div>}
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900">Progress Timeline</h3>
            {activeNotice.timeline.map((item, idx) => (
                <div key={idx} className="flex space-x-4 border-l-2 border-slate-100 pl-4 py-2">
                    <p className="text-xs text-slate-500 font-mono w-24">{item.time}</p>
                    <p className="text-xs text-slate-900">{item.description}</p>
                </div>
            ))}
        </div>
      </div>
      
    </div>
  );
}
