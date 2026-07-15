import React, { useState } from "react";
import { Menu, X, ShieldAlert, Calendar, Mail, FileText } from "lucide-react";
import municipalityLogo from "../assets/images/thulamela_coat_of_arms.png";

interface PublicNavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isLoggedIn: boolean;
  userRole?: string;
  userName?: string;
  onLogout: () => void;
}

export default function PublicNavbar({
  currentView,
  onNavigate,
  isLoggedIn,
  userRole,
  userName,
  onLogout
}: PublicNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "about", label: "About Municipality" },
    { id: "services", label: "Municipal Services" },
    { id: "contact", label: "Contact Us" }
  ];

  return (
    <nav id="public-navbar" className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      {/* Top emergency banner indicator inside the bar */}
      <div className="bg-gov-green text-white text-xs px-4 py-2 flex justify-between items-center font-semibold tracking-wide md:px-8">
        <div className="flex items-center space-x-4">
          <span className="hidden md:inline">Official Website of Thulamela Local Municipality • Limpopo, South Africa</span>
          <span className="flex md:hidden items-center"><Mail size={12} className="mr-1.5 text-gov-yellow" /> info@thulamela.gov.za</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="hidden sm:inline">24/7 Emergency: 015 962 4140</span>
          <span className="flex items-center text-gov-yellow font-bold animate-pulse">
            <ShieldAlert size={12} className="mr-1 text-gov-yellow" />
            <span>Emergency Toll-Free: 080 020 4110</span>
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            {/* Logo placeholder styled with Editorial Theme */}
            <div 
              onClick={() => onNavigate("home")} 
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <img src={municipalityLogo} alt="Thulamela Municipality Logo" className="w-12 h-12 object-contain rounded-full shadow-sm border border-slate-200" />
              <div>
                <h1 className="text-lg font-extrabold text-gov-green leading-tight tracking-tight uppercase">
                  THULAMELA
                </h1>
                <p className="text-[10px] uppercase tracking-tighter font-bold text-gov-blue">
                  Municipality CRM System
                </p>
                <span className="text-[9px] text-slate-500 block leading-none font-mono">LIM473 • Limpopo Province</span>
              </div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden lg:flex items-center space-x-6 text-sm font-bold text-gray-700">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onNavigate(item.id)}
                  className={`pb-1 transition-colors ${
                    isActive
                      ? "text-gov-green border-b-2 border-gov-green"
                      : "text-slate-700 hover:text-gov-green"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <button
                  id="nav-dashboard-redirect"
                  onClick={() => onNavigate(userRole === "councillor" ? "councillor-dashboard" : "admin-dashboard")}
                  className="px-4 py-2 bg-gov-blue hover:bg-gov-blue-hover text-white text-xs font-bold rounded-lg shadow-sm uppercase tracking-wider transition-all"
                >
                  My Dashboard
                </button>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block leading-none">Logged in as</span>
                  <span className="text-xs font-bold text-slate-800 font-mono block leading-none mt-1">{userName}</span>
                </div>
                <button
                  id="nav-logout-btn"
                  onClick={onLogout}
                  className="px-3 py-1.5 border border-slate-200 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 hover:border-red-100 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                id="nav-councillor-login"
                onClick={() => onNavigate("councillor-login")}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm uppercase tracking-wider transition-all ${
                  currentView === "councillor-login"
                    ? "bg-gov-yellow text-slate-900 border border-gov-yellow-hover"
                    : "bg-gov-green hover:bg-gov-green-hover text-white hover:shadow-md"
                }`}
              >
                Councillor Login
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center lg:hidden">
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="mobile-nav-panel" className="lg:hidden bg-slate-50 border-t border-slate-200 py-3 px-4 space-y-2 shadow-inner">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold block ${
                currentView === item.id
                  ? "bg-gov-green text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="border-t border-slate-200 my-2 pt-2"></div>
          {isLoggedIn ? (
            <div className="space-y-2">
              <div className="px-4 py-1.5">
                <span className="text-xs text-slate-500 block">Logged in as</span>
                <span className="text-sm font-bold text-slate-800 font-mono">{userName}</span>
              </div>
              <button
                id="mobile-nav-dashboard"
                onClick={() => {
                  onNavigate(userRole === "councillor" ? "councillor-dashboard" : "admin-dashboard");
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center px-4 py-2.5 bg-gov-blue hover:bg-gov-blue-hover text-white rounded-lg text-sm font-bold block shadow-sm uppercase tracking-wider"
              >
                My Dashboard
              </button>
              <button
                id="mobile-nav-logout"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center px-4 py-2 border border-slate-200 text-red-600 rounded-lg text-sm font-bold block hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              id="mobile-nav-login"
              onClick={() => {
                onNavigate("councillor-login");
                setMobileMenuOpen(false);
              }}
              className="w-full text-center px-4 py-2.5 bg-gov-green hover:bg-gov-green-hover text-white rounded-lg text-sm font-bold block shadow-sm uppercase tracking-wider"
            >
              Councillor Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
