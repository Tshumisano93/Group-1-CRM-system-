import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { initializeDb, getCurrentUser, setCurrentUser } from "./db";
import { User } from "./types";

// Public Views
import PublicNavbar from "./components/PublicNavbar";
import PublicFooter from "./components/PublicFooter";
import PublicHome from "./components/PublicHome";
import PublicAbout from "./components/PublicAbout";
import PublicServices from "./components/PublicServices";
import PublicContact from "./components/PublicContact";
import PublicWards from "./components/PublicWards";
import ServiceDashboard from "./components/ServiceDashboard";

// Authentication Portals
import CouncillorLogin from "./components/CouncillorLogin";
import AdminLogin from "./components/AdminLogin";

// Internal Dashboards
import CouncillorDashboard from "./components/CouncillorDashboard";
import AdminDashboard from "./components/AdminDashboard";
import TechnicianDashboard from "./components/TechnicianDashboard";

interface Toast {
  id: string;
  title: string;
  message: string;
  type: "success" | "info" | "warning" | "error";
}

const VIEW_TO_PATH: Record<string, string> = {
  "home": "/",
  "about": "/about",
  "services": "/services",
  "wards": "/wards",
  "contact": "/contact",
  "councillor-login": "/login",
  "admin-login": "/admin",
  "councillor-dashboard": "/councillor-dashboard",
  "admin-dashboard": "/admin-dashboard",
  "technician-dashboard": "/technician-dashboard",
};

const PATH_TO_VIEW: Record<string, string> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH).map(([view, path]) => [path, view])
);

function viewFromPath(pathname: string): string {
  return PATH_TO_VIEW[pathname] ?? "home";
}

function ProtectedRoute({
  currentUser,
  children,
}: {
  currentUser: User | null;
  children: React.ReactNode;
}) {
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentView = viewFromPath(location.pathname);

  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    initializeDb();
    const existingUser = getCurrentUser();
    if (existingUser) {
      setCurrentUserState(existingUser);
    }
  }, []);

  const addToast = (title: string, message: string, type: "success" | "info" | "warning" | "error") => {
    const newToast: Toast = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title,
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    navigate("/");
    addToast("Session Logged Out", "You have been securely logged out of the Thulamela CRM network.", "info");
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUserState(user);
    if (user.role === "councillor") {
      navigate("/councillor-dashboard");
    } else if (user.role === "technician") {
      navigate("/technician-dashboard");
    } else {
      navigate("/admin-dashboard");
    }
  };

  const handleNavigate = (view: string) => {
    const path = VIEW_TO_PATH[view] ?? "/";
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isDashboardView =
    currentView === "councillor-dashboard" ||
    currentView === "admin-dashboard" ||
    currentView === "technician-dashboard";

  return (
    <div id="thulamela-crm-application-root" className="min-h-screen flex flex-col font-sans text-slate-800 bg-slate-50">

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

      <div className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            <Route
              path="/"
              element={
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PublicHome onNavigate={handleNavigate} onAddToast={addToast} />
                </motion.div>
              }
            />
            <Route
              path="/about"
              element={
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PublicAbout />
                </motion.div>
              }
            />
            <Route
              path="/services"
              element={
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PublicServices />
                </motion.div>
              }
            />
            <Route
              path="/wards"
              element={
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PublicWards />
                </motion.div>
              }
            />
            <Route
              path="/contact"
              element={
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <PublicContact onAddToast={addToast} />
                </motion.div>
              }
            />

          <Route
            path="/login"
            element={
              <CouncillorLogin
                onLoginSuccess={handleLoginSuccess}
                onNavigate={handleNavigate}
                onAddToast={addToast}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminLogin
                onLoginSuccess={handleLoginSuccess}
                onNavigate={handleNavigate}
                onAddToast={addToast}
              />
            }
          />

          <Route
            path="/councillor-dashboard"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <CouncillorDashboard
                  currentUser={currentUser as User}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  onAddToast={addToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/technician-dashboard"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <TechnicianDashboard
                  currentUser={currentUser as User}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  onAddToast={addToast}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute currentUser={currentUser}>
                <AdminDashboard
                  currentUser={currentUser as User}
                  onLogout={handleLogout}
                  onNavigate={handleNavigate}
                  onAddToast={addToast}
                />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>

      {!isDashboardView && (
        <PublicFooter onNavigate={handleNavigate} />
      )}

      <div id="crm-toast-portal" className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-2xl border text-xs leading-relaxed flex items-start justify-between space-x-3 transition-all transform duration-300 translate-y-0 animate-slide-in ${
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
