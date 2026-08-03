import React, { useState } from "react";
import { Lock, User as UserIcon, ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";
import { getUsers, setCurrentUser, addAuditLog, getSyncStatus, findUserByIdentifier } from "../db";
import { User } from "../types";
import { isFirebaseEnabled, auth } from "../firebase";
import { signInWithEmailAndPassword, fetchSignInMethodsForEmail } from "firebase/auth";

interface AdminLoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (view: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function AdminLogin({ onLoginSuccess, onNavigate, onAddToast }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onAddToast("Login Failed", "Username and password are required.", "warning");
      return;
    }

    setLoading(true);

    try {
      const enteredVal = username.trim().toLowerCase().replace(/\s+/g, ""); // ignores all accidental spaces and casing
      
      console.log(`[LOGIN ATTEMPT]: Initiating administrative login search. Search query (normalized): "${enteredVal}"`);
      
      const dbStatus = getSyncStatus();
      console.log(`[FIRESTORE QUERY STATUS]: Real-time sync status is currently: "${dbStatus}"`);

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine || dbStatus === "offline";
      if (isOffline) {
        console.error(`[FIRESTORE UNREACHABLE]: Secure database is unreachable. Cannot verify identifier "${username.trim()}".`);
        setLoading(false);
        onAddToast("Authentication Failed", "Unable to connect to the CRM database", "error");
        return;
      }
      
      const matchedUser = await findUserByIdentifier(enteredVal);

      if (matchedUser) {
        console.log(`[LOGIN MATCH FOUND]: User matching identifier "${enteredVal}" was found! Name: "${matchedUser.name}", ID: "${matchedUser.id}", Role: "${matchedUser.role}"`);
      } else {
        console.warn(`[LOGIN MATCH FAILED]: No user registered under identifier "${enteredVal}" inside user database.`);
      }

      if (!matchedUser) {
        setLoading(false);
        onAddToast("Authentication Failed", "Username not found", "error");
        return;
      }

      if (matchedUser.role === "councillor") {
        setLoading(false);
        onAddToast("Access Denied", "Councillor accounts must use the main Councillor Login portal.", "warning");
        return;
      }

      if (matchedUser.status !== "active") {
        setLoading(false);
        onAddToast("Authentication Failed", "Account is inactive", "error");
        return;
      }

      if (isFirebaseEnabled && auth) {
        try {
          await signInWithEmailAndPassword(auth, matchedUser.email, password);
        } catch (err: any) {
          const isNetworkError = err.message?.includes("network") || err.code?.includes("network") || err.message?.includes("unavailable") || err.code?.includes("unavailable") || err.message?.includes("offline");
          if (isNetworkError) {
            console.error("[FIRESTORE UNREACHABLE]: Firebase Auth server could not be reached. Connection error:", err.message);
            setLoading(false);
            onAddToast("Authentication Failed", "Unable to connect to the CRM database", "error");
            return;
          }

          if (
            err.code === "auth/wrong-password" ||
            err.code === "auth/invalid-credential" ||
            err.message?.includes("password") ||
            err.message?.includes("invalid-credential") ||
            err.message?.includes("wrong-password")
          ) {
            setLoading(false);
            onAddToast("Authentication Failed", "Invalid password provided", "error");
            return;
          }

          setLoading(false);
          onAddToast("Authentication Failed", err.message || "Invalid credentials", "error");
          return;
        }
      }

      // Success
      setCurrentUser(matchedUser);
      addAuditLog(
        matchedUser.id,
        matchedUser.name,
        matchedUser.role,
        "Admin Login",
        `Administrative user logged in successfully. Role: ${matchedUser.role}.`
      );

      setLoading(false);
      onLoginSuccess(matchedUser);
      onAddToast(
        "Secure Session Established",
        `Welcome, ${matchedUser.name}! Opening Executive Dashboard...`,
        "success"
      );
    } catch (err: any) {
      setLoading(false);
      onAddToast("Authentication Failed", `An unexpected login error occurred: ${err.message}`, "error");
    }
  };

  return (
    <div id="admin-login-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
        
        {/* Left Form Box */}
        <div className="lg:col-span-6 bg-slate-900 text-white shadow-2xl rounded-2xl p-6 sm:p-8 border border-slate-800">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-full border border-gov-yellow/30 bg-slate-800 flex items-center justify-center mx-auto text-gov-yellow shadow-md">
              <KeyRound size={26} />
            </div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-tight">SECURE STAFF PORTAL</h2>
            <p className="text-xs text-slate-400">Departmental & Technical Services CRM Entry</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">Staff Username / LDAP ID</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. superadmin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-gov-yellow focus:bg-slate-800/50 transition-all font-semibold font-mono text-base"
                />
                <UserIcon className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-300 block">Security Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-10 text-slate-100 focus:outline-none focus:border-gov-yellow focus:bg-slate-800/50 transition-all font-mono font-bold text-base"
                />
                <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-200 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              id="admin-authenticate-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gov-yellow hover:bg-gov-yellow-hover text-slate-950 font-black py-3.5 px-6 rounded-xl shadow-md uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Establish Secure Session</span>
              )}
            </button>
          </form>

          {/* Quick Fill Accounts */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Verified Dev Quick Fill Credentials
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setUsername("munadmin");
                  setPassword("Thulamela@2026");
                }}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-gov-yellow/50 rounded-lg text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-gov-yellow group-hover:text-yellow-300">Municipal Admin</div>
                <div className="text-[9px] text-slate-400 font-mono">munadmin</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("superadmin");
                  setPassword("Thulamela@2026");
                }}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-gov-yellow/50 rounded-lg text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-white">Super Admin</div>
                <div className="text-[9px] text-slate-400 font-mono">superadmin</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername("tech1");
                  setPassword("Thulamela@2026");
                }}
                className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-gov-yellow/50 rounded-lg text-left transition-all group"
              >
                <div className="text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300">Technician</div>
                <div className="text-[9px] text-slate-400 font-mono">tech1</div>
              </button>
            </div>
            <div className="text-[10px] text-slate-400 text-center font-mono pt-1">
              Verified Password: <code className="text-gov-yellow bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-bold">Thulamela@2026</code>
            </div>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-100 shadow-xl rounded-2xl p-6 sm:p-8 space-y-4">
            <span className="text-gov-blue font-bold uppercase text-[9px] font-mono tracking-widest block">
              Authorization Protocols
            </span>
            <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center">
              <ShieldAlert className="mr-2 text-gov-blue" size={18} />
              <span>Administrative Access</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This digital segment hosts the executive dashboards for Super Admins, Departmental Admins, and dispatch Technicians. Action entries are audited in accordance with the municipal information governance protocols.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
