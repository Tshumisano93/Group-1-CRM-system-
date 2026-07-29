import React from "react";
import { Mail, Phone, MapPin, Clock, ShieldAlert } from "lucide-react";
import { APIProvider, Map, AdvancedMarker, Pin, ControlPosition } from "@vis.gl/react-google-maps";
import PublicFeedbackForm from "./PublicFeedbackForm";

interface PublicContactProps {
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";
const OFFICE_COORDS = { lat: -22.9786, lng: 30.4578 };

export default function PublicContact({ onAddToast }: PublicContactProps) {
  const emergencyContacts = [
    { label: "Fire & Rescue (Vhembe Disaster Centre)", phone: "015 962 5351" },
    { label: "Ambulance / Emergency Medical", phone: "10177 / 015 962 4611" },
    { label: "South African Police Service (SAPS Thohoyandou)", phone: "015 960 1000 / 10111" },
    { label: "Municipal Disaster Management", phone: "080 020 4110" },
    { label: "Eskom Customer Care (Power Faults)", phone: "086 003 7566" }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
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
        <div className="lg:col-span-7">
            <PublicFeedbackForm onAddToast={onAddToast} />
        </div>
      </div>

      {/* Interactive Map */}
      <div id="maps-section" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5">
        <div className="relative h-96 rounded-xl overflow-hidden border border-slate-200">
          {hasValidKey ? (
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={OFFICE_COORDS}
                defaultZoom={15}
                mapId="PUBLIC_CONTACT_MAP"
                style={{ width: "100%", height: "100%" }}
                mapTypeControl={true}
                defaultMapTypeId="roadmap"
                mapTypeControlOptions={{ position: ControlPosition.TOP_RIGHT }}
              >
                <AdvancedMarker position={OFFICE_COORDS}>
                  <Pin background={"#004d25"} glyphColor={"#ffffff"} borderColor={"#000000"} />
                </AdvancedMarker>
              </Map>
            </APIProvider>
          ) : (
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3557.551608682121!2d30.4578130752179!3d-22.97858693489873!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1ec379e49a882f05%3A0x88924b2787d54e4c!2sThulamela+Local+Municipality+Civic+Centre!5e0!3m2!1sen!2sza!4v1720686900000!5m2!1sen!2sza"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Thulamela Municipality Location"
              className="rounded-xl"
            ></iframe>
          )}
        </div>
        
        {/* Contact details below map */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 px-2 text-xs text-slate-700">
          <div className="flex items-center space-x-2">
            <MapPin className="text-gov-green" size={16} />
            <span className="font-medium">Thulamela Local Municipality Civic Centre, Thohoyandou, Limpopo</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="text-gov-blue" size={16} />
            <span className="font-medium">+27 (0)15 962 7500</span>
          </div>
          <div className="flex items-center space-x-2">
            <Mail className="text-emerald-700" size={16} />
            <span className="font-medium">info@thulamela.gov.za</span>
          </div>
        </div>
      </div>

    </div>
  );
}
