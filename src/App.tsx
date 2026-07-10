import React, { useState, useEffect } from "react";
import { initializeDb, getCurrentUser, setCurrentUser } from "./db";
import { User } from "./types";

// Public Views
import PublicNavbar from "./components/PublicNavbar";
import PublicFooter from "./components/PublicFooter";
import PublicHome from "./components/PublicHome";
import PublicAbout from "./components/PublicAbout";
import PublicServices from "./components/PublicServices";
import PublicContact from "./components/PublicContact";

// Authentication Portals
import CouncillorLogin from "./components/CouncillorLogin";
import AdminLogin from "./components/AdminLogin";

// Internal Dashboards
import CouncillorDashboard from "./components/CouncillorDashboard";
import AdminDashboard from "./components/AdminDashboard";
import TechnicianDashboard from "./components/TechnicianDashboard";

// Toast Alert Object Interface
interface Toast {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

export default function App() {
  const [currentView, setCurrentView] = useState<string>("home");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Initialize DB and authenticate active sessions
  useEffect(() => {
    initializeDb();
    const storedUser = getCurrentUser();
    if (storedUser) {
      setCurrentUser(storedUser);
      if (storedUser.role === "councillor") {
        setCurrentView("councillor-dashboard");
      } else if (storedUser.role === "technician") {
        setCurrentView("technician-dashboard");
      } else {
        setCurrentView("admin-dashboard");
      }
    }

    // Hash-based URL router helper
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#home" || hash === "") setCurrentView("home");
      else if (hash === "#about") setCurrentView("about");
      else if (hash === "#services") setCurrentView("services");
      else if (hash === "#contact") setCurrentView("contact");
      else if (hash === "#login") setCurrentView("councillor-login");
      else if (hash === "#admin") setCurrentView("admin-login");
    };

    window.addEventListener("hashchange", handleHashChange);
    // Initial check
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Toast dispatch helper
  const addToast = (title: string, message: string, type: "success" | "info" | "warning" | "error") => {
    const newToast: Toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);

    // Self-dismiss after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Logouts
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView("home");
    window.location.hash = "#home";
    addToast("Session Logged Out", "You have been securely logged out of the Thulamela CRM network.", "info");
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === "councillor") {
      setCurrentView("councillor-dashboard");
    } else if (user.role === "technician") {
      setCurrentView("technician-dashboard");
    } else {
      setCurrentView("admin-dashboard");
    }
  };

  // Navigation switch helper
  const handleNavigate = (view: string) => {
    // Sync browser hash for seamless routing
    if (view === "home") window.location.hash = "#home";
    else if (view === "about") window.location.hash = "#about";
    else if (view === "services") window.location.hash = "#services";
    else if (view === "contact") window.location.hash = "#contact";
    else if (view === "councillor-login") window.location.hash = "#login";
    else if (view === "admin-login") window.location.hash = "#admin";
    
    setCurrentView(view);
    // Scroll to top of preview viewport
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Determine which viewport to render
  const renderViewContent = () => {
    switch (currentView) {
      case "home":
        return <PublicHome onNavigate={handleNavigate} />;
      case "about":
        return <PublicAbout />;
      case "services":
        return <PublicServices />;
      case "contact":
        return <PublicContact onAddToast={addToast} />;
      case "councillor-login":
        return (
          <CouncillorLogin 
            onLoginSuccess={handleLoginSuccess} 
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        );
      case "admin-login":
        return (
          <AdminLogin 
            onLoginSuccess={handleLoginSuccess} 
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        );
      case "councillor-dashboard":
        if (!currentUser) return <PublicHome onNavigate={handleNavigate} />;
        return (
          <CouncillorDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        );
      case "technician-dashboard":
        if (!currentUser) return <PublicHome onNavigate={handleNavigate} />;
        return (
          <TechnicianDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        );
      case "admin-dashboard":
        if (!currentUser) return <PublicHome onNavigate={handleNavigate} />;
        return (
          <AdminDashboard 
            currentUser={currentUser} 
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onAddToast={addToast}
          />
        );
      default:
        return <PublicHome onNavigate={handleNavigate} />;
    }
  };

  // Determine if public navigation and public footers are required (e.g. not in dashboards)
  const isDashboardView = currentView === "councillor-dashboard" || currentView === "admin-dashboard" || currentView === "technician-dashboard";

  return (
    <div id="thulamela-crm-application-root" className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">
      
      {/* Top Banner & public Navigation Bar */}
      {!isDashboardView && (
        <PublicNavbar 
          currentView={currentView} 
          onNavigate={handleNavigate} 
          isLoggedIn={!!currentUser}
          userRole={currentUser?.role}
          userName={currentUser?.name}
          onLogout={handleLogout}
        />
      )}

      {/* Main Viewport Container */}
      <div className="flex-grow">
        {renderViewContent()}
      </div>

      {/* Public Footer */}
      {!isDashboardView && (
        <PublicFooter onNavigate={handleNavigate} />
      )}

      {/* Elegant Stacked Toast Alerts */}
      <div id="crm-toast-portal" className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border text-xs leading-relaxed flex items-start justify-between space-x-3 transition-all transform duration-300 translate-y-0 animate-slideIn ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-950 border-emerald-200"
                : toast.type === "error"
                ? "bg-red-50 text-red-950 border-red-200"
                : toast.type === "warning"
                ? "bg-amber-50 text-amber-950 border-amber-200"
                : "bg-blue-50 text-blue-950 border-blue-200"
            }`}
          >
            <div className="space-y-0.5">
              <h4 className="font-black uppercase tracking-tight text-[11px] flex items-center">
                <span className={`w-2 h-2 rounded-full mr-2 inline-block ${
                  toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : toast.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                }`}></span>
                {toast.title}
              </h4>
              <p className="text-slate-700 font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 font-bold self-start mt-0.5"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
