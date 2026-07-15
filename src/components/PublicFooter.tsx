import React from "react";
import { Mail, Phone, MapPin, ShieldAlert, Heart } from "lucide-react";

interface PublicFooterProps {
  onNavigate: (view: string) => void;
}

export default function PublicFooter({ onNavigate }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="public-footer" className="bg-white text-slate-600 border-t border-slate-200 shadow-sm mt-12">
      {/* Footer Top Badges Section */}
      <div className="bg-slate-50 text-slate-800 py-6 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <div className="bg-gov-green/10 p-2.5 rounded-xl text-gov-green">
              <MapPin size={20} className="text-gov-green" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Physical Address</h4>
              <p className="text-xs text-slate-500 mt-0.5">Thohoyandou Civic Centre, Old Mutual Building, Limpopo, 0950</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start space-x-3">
            <div className="bg-gov-blue/10 p-2.5 rounded-xl text-gov-blue">
              <Phone size={20} className="text-gov-blue" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-900">Customer Care Call Centre</h4>
              <p className="text-xs text-slate-500 mt-0.5">015 962 7500 / 015 962 4023</p>
            </div>
          </div>

          <div className="flex items-center justify-center md:justify-start space-x-3">
            <div className="bg-red-50 p-2.5 rounded-xl text-red-600 border border-red-100">
              <ShieldAlert size={20} className="text-red-600 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-red-700">Emergency Hotlines</h4>
              <p className="text-xs text-slate-500 mt-0.5">Fire/Disaster: 015 962 5351 | Police: 10111</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden">
              <div className="text-xs font-black text-gov-green">THU</div>
            </div>
            <div>
              <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Thulamela Municipality</h3>
              <p className="text-[10px] text-gov-green uppercase font-mono tracking-wider font-extrabold">Service Delivery CRM</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Developing Thulamela Municipality into a premier developmental, digital-forward gateway in South Africa, providing affordable, high-quality municipal services to all 41 local wards.
          </p>
          <div className="pt-2">
            <span className="inline-block bg-gov-green/10 text-gov-green text-[10px] font-bold px-2 py-1 rounded border border-gov-green/20">
              We Serve With Dedication
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-slate-900 font-extrabold uppercase text-xs tracking-wider mb-4 border-l-2 border-gov-yellow pl-2">
            Public Quick Links
          </h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button onClick={() => onNavigate("home")} className="hover:text-gov-blue hover:underline transition-all text-slate-600 font-medium">
                Municipal Home
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("about")} className="hover:text-gov-blue hover:underline transition-all text-slate-600 font-medium">
                About Municipality
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("services")} className="hover:text-gov-blue hover:underline transition-all text-slate-600 font-medium">
                Municipal Services
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("contact")} className="hover:text-gov-blue hover:underline transition-all text-slate-600 font-medium">
                Contact & Complaints Office
              </button>
            </li>
            <li>
              <button onClick={() => onNavigate("councillor-login")} className="hover:text-gov-blue hover:underline transition-all text-gov-blue font-extrabold uppercase tracking-wide text-[10px]">
                Ward Councillor Login
              </button>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-900 font-extrabold uppercase text-xs tracking-wider mb-4 border-l-2 border-gov-yellow pl-2">
            Operating Hours
          </h4>
          <ul className="space-y-2 text-xs text-slate-500 font-mono">
            <li>Monday: 07:45 - 16:30</li>
            <li>Tuesday: 07:45 - 16:30</li>
            <li>Wednesday: 07:45 - 16:30</li>
            <li>Thursday: 07:45 - 16:30</li>
            <li>Friday: 07:45 - 16:30</li>
            <li className="text-gov-green text-[10px] uppercase font-sans font-extrabold mt-1">Weekends & Holidays: Closed (Call Emergency Hotline)</li>
          </ul>
        </div>

        <div>
          <h4 className="text-slate-900 font-extrabold uppercase text-xs tracking-wider mb-4 border-l-2 border-gov-yellow pl-2">
            Strategic Mission
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed mb-4 italic">
            "To build a sustainable, progressive and model municipality through transparent public service delivery, robust community participation and total municipal infrastructure stewardship."
          </p>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <h5 className="text-[10px] uppercase text-gov-blue font-bold tracking-wider mb-1">Administrative Access</h5>
            <button
              id="footer-admin-link"
              onClick={() => onNavigate("admin-login")}
              className="text-xs text-slate-600 hover:text-gov-blue hover:underline font-bold transition-all text-left block"
            >
              Secure Staff & Departmental Portal
            </button>
          </div>
        </div>
      </div>

      {/* Footer Bottom copyright and legal details */}
      <div className="bg-slate-50 text-slate-500 py-6 text-xs text-center border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-slate-500 text-left md:text-center max-w-2xl leading-relaxed">
            &copy; {currentYear} Thulamela Local Municipality (LIM473) CRM System. Developed in alignment with Department of Cooperative Governance and Traditional Affairs (CoGTA) frameworks. All Rights Reserved.
          </p>
          <p className="flex items-center space-x-1 text-slate-500 shrink-0">
            <span>Powered by Digital Transformation</span>
            <Heart size={10} className="text-red-500 fill-current" />
            <span>• Limpopo, South Africa</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
