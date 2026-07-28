import React, { useState } from "react";
import { Lock, User as UserIcon, ShieldCheck, CheckSquare, Eye, EyeOff, Building2 } from "lucide-react";
import { getUsers, setCurrentUser, addAuditLog } from "../db";
import { User } from "../types";
import RequestAccountModal from "./RequestAccountModal";
import { isFirebaseEnabled, auth } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

interface CouncillorLoginProps {
  onLoginSuccess: (user: User) => void;
  onNavigate: (view: string) => void;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function CouncillorLogin({ onLoginSuccess, onNavigate, onAddToast }: CouncillorLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onAddToast("Login Failed", "Username and password are required.", "warning");
      return;
    }

    setLoading(true);

    try {
      const users = getUsers();
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
        onAddToast("Authentication Failed", "Username not registered in the CRM database.", "error");
        return;
      }

      if (matchedUser.role !== "councillor") {
        setLoading(false);
        onAddToast("Access Denied", "Please use the Secure Staff Access portal for administrator/technician accounts.", "warning");
        return;
      }

      if (matchedUser.status !== "active") {
        setLoading(false);
        onAddToast("Account Suspended", "This councillor account is currently deactivated. Contact the Super Administrator.", "error");
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
        "User Login",
        `Councillor logged in successfully. Ward: ${matchedUser.wardNumber} (${matchedUser.wardName}).`
      );

      setLoading(false);
      onLoginSuccess(matchedUser);
      onAddToast("Login Successful", `Welcome back, Cllr ${matchedUser.name.split(" ").slice(-1)[0]}! Redirecting...`, "success");
    } catch (err: any) {
      setLoading(false);
      onAddToast("Authentication Failed", `An unexpected login error occurred: ${err.message}`, "error");
    }
  };

  const handleAutofill = (usernameVal: string) => {
    setUsername(usernameVal);
    setPassword("");
    onAddToast("Credentials Preloaded", `Selected ${usernameVal}. Please enter your correct account password to login.`, "info");
  };

  return (
    <div id="councillor-login-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
        
        {/* Left column: Login Form */}
        <div className="lg:col-span-6 bg-white border border-slate-100 shadow-xl rounded-2xl p-6 sm:p-8">
          <div className="text-center space-y-2 mb-6">
            <div className="w-14 h-14 rounded-full border-2 border-gov-green bg-slate-50 flex items-center justify-center mx-auto text-gov-green shadow-sm">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Councillor Login</h2>
            <p className="text-xs text-slate-500">Secure Service Delivery Complaint Relationship Management</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Username / Account ID</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. cllr1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-semibold text-base"
                />
                <UserIcon className="absolute left-3.5 top-3 text-slate-400" size={16} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-10 focus:outline-none focus:border-gov-green focus:bg-white transition-all font-mono font-bold text-base"
                />
                <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-slate-600 font-semibold pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-gov-green border-slate-300 focus:ring-gov-green text-base"
                />
                <span>Remember Me</span>
              </label>
              <button
                type="button"
                onClick={() => onAddToast("Password Recovery", "Please contact Vhembe IT division or the Super Administrator to reset password credentials.", "info")}
                className="hover:text-gov-green hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <button
              id="councillor-authenticate-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gov-green hover:bg-gov-green-hover text-white font-bold py-3.5 px-6 rounded-xl shadow-md uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Authenticate Account</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 px-6 rounded-xl shadow-sm uppercase tracking-wider transition-all"
            >
              Request New Account
            </button>
          </form>
          {showRequestModal && (
            <RequestAccountModal 
              onClose={() => setShowRequestModal(false)} 
              onAddToast={onAddToast}
            />
          )}
        </div>

        {/* Right column: Info & Tester Helper */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white text-slate-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-sm border border-slate-200">
            <span className="text-gov-blue font-extrabold uppercase text-[10px] font-sans tracking-widest block">
              We Serve With Dedication
            </span>
            <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center">
              <Building2 className="mr-2 text-gov-green" size={18} />
              <span>Councillor Mandate</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This secure portal is strictly reserved for registered Thulamela Ward Councillors. Upon logging in, you will be directed to your local ward cockpit to lodge community complaints, view assigned technicians, and track SLAs.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h4 className="text-[10px] uppercase font-bold text-gov-blue font-sans tracking-wider">
                Testing Demo Credentials (Autofill Helper)
              </h4>
              <p className="text-[10px] text-slate-500">
                To test the specific councillor dashboards instantly without typing, click any councillor button below to pre-load credentials:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <button
                  id="autofill-cllr1"
                  type="button"
                  onClick={() => handleAutofill("cllr1")}
                  className="bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-lg text-left transition-all border border-slate-200 flex flex-col justify-between hover:border-gov-blue hover:shadow-sm"
                >
                  <span className="font-bold">Cllr A. Radzilani</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">cllr1 • Ward 1 (Makwarela)</span>
                </button>

                <button
                  id="autofill-cllr2"
                  type="button"
                  onClick={() => handleAutofill("cllr2")}
                  className="bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-lg text-left transition-all border border-slate-200 flex flex-col justify-between hover:border-gov-blue hover:shadow-sm"
                >
                  <span className="font-bold">Cllr M. Nemudzivhadi</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">cllr2 • Ward 2 (Sibasa)</span>
                </button>

                <button
                  id="autofill-cllr5"
                  type="button"
                  onClick={() => handleAutofill("cllr5")}
                  className="bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-lg text-left transition-all border border-slate-200 flex flex-col justify-between hover:border-gov-blue hover:shadow-sm"
                >
                  <span className="font-bold">Cllr K. Rambuda</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">cllr5 • Ward 5 (Maniini)</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-400 text-center font-mono pt-1">SECURE CLIENT TRANSIT ACTIVATED</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
