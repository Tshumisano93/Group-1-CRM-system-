import React, { useState } from "react";
import { Lock, User as UserIcon, ShieldAlert, KeyRound, Eye, EyeOff, Terminal } from "lucide-react";
import { getUsers, setCurrentUser, addAuditLog } from "../db";
import { User } from "../types";
import { isFirebaseEnabled, auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

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
      const users = Array.isArray(getUsers()) ? getUsers() : [];
      const enteredVal = username.toLowerCase().trim();

      const matchedUser = users.find(
        (u) =>
          (u.username || "").toLowerCase().trim() === enteredVal ||
          (u.email || "").toLowerCase().trim() === enteredVal ||
          (u.name || "").toLowerCase().trim() === enteredVal ||
          (u.id || "").toLowerCase().trim() === enteredVal
      );

      if (!matchedUser) {
        setLoading(false);
        onAddToast("Authentication Failed", "Username or account ID not registered in the administrative database.", "error");
        return;
      }

      if (matchedUser.role === "councillor") {
        setLoading(false);
        onAddToast("Access Denied", "Councillor accounts must use the main Councillor Login portal.", "warning");
        return;
      }

      if (matchedUser.status !== "active") {
        setLoading(false);
        onAddToast("Account Suspended", "This staff account is currently deactivated. Contact Vhembe IT support.", "error");
        return;
      }

      if (isFirebaseEnabled && auth) {
        try {
          await signInWithEmailAndPassword(auth, matchedUser.email, password);
        } catch (err: any) {
          if (
            err.code === "auth/user-not-found" ||
            err.code === "auth/invalid-credential" ||
            err.message?.includes("user-not-found") ||
            err.message?.includes("invalid-credential")
          ) {
            try {
              await createUserWithEmailAndPassword(auth, matchedUser.email, password);
            } catch (createErr: any) {
              if (createErr.code === "auth/email-already-in-use") {
                setLoading(false);
                onAddToast("Authentication Failed", "Incorrect password for this account.", "error");
                return;
              } else if (createErr.code === "auth/weak-password") {
                setLoading(false);
                onAddToast("Authentication Failed", "Password must be at least 6 characters.", "error");
                return;
              } else {
                setLoading(false);
                onAddToast("Authentication Failed", `Authentication error: ${createErr.message}`, "error");
                return;
              }
            }
          } else {
            setLoading(false);
            onAddToast("Authentication Failed", `Incorrect password or authentication error: ${err.message}`, "error");
            return;
          }
        }
      } else {
        setLoading(false);
        onAddToast("Authentication Failed", "Authentication service is currently offline.", "error");
        return;
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

  const handleAutofill = (usernameVal: string) => {
    setUsername(usernameVal);
    setPassword("");
    onAddToast("Credentials Preloaded", `Preloaded ${usernameVal}. Please enter the correct account password to login.`, "info");
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

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-gov-blue font-mono tracking-wider flex items-center">
                <Terminal size={12} className="mr-1.5" /> LDAP Testing Presets (Autofill)
              </h4>
              <p className="text-[10px] text-slate-500">
                To test the comprehensive roles, click any staff card below to pre-load credentials:
              </p>
              
              <div className="space-y-2 text-[11px]">
                <button
                  id="autofill-superadmin"
                  type="button"
                  onClick={() => handleAutofill("superadmin")}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-lg text-left transition-all border border-slate-200 flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold block">Super Administrator (Thilivhali M.)</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">superadmin • Complete governance & ward control</span>
                  </div>
                  <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">SUPER</span>
                </button>

                <button
                  id="autofill-munadmin"
                  type="button"
                  onClick={() => handleAutofill("munadmin")}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-lg text-left transition-all border border-slate-200 flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold block">Municipal Admin (Tshifhiwa N.)</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">munadmin • Dispatches tech & monitors complaints</span>
                  </div>
                  <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">ADMIN</span>
                </button>

                <button
                  id="autofill-tech1"
                  type="button"
                  onClick={() => handleAutofill("tech1")}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-lg text-left transition-all border border-slate-200 flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold block">Field Technician (Vhonani M.)</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">tech1 • Solves water supply tickets & adds logs</span>
                  </div>
                  <span className="bg-amber-100 text-slate-800 font-bold px-1.5 py-0.5 rounded text-[8px] uppercase">TECH</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-500 text-center font-mono">SECURE TRANSIT SSL ACTIVATED</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
