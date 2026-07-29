import React, { useState } from "react";
import { Lock, User as UserIcon, ShieldCheck, CheckSquare, Eye, EyeOff, Building2 } from "lucide-react";
import { getUsers, setCurrentUser, addAuditLog, getSyncStatus } from "../db";
import { User } from "../types";
import RequestAccountModal from "./RequestAccountModal";
import { isFirebaseEnabled, auth } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

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
      const enteredVal = username.trim().toLowerCase().replace(/\s+/g, ""); // ignores all accidental spaces and casing
      
      console.log(`[LOGIN ATTEMPT]: Initiating councillor login search. Search query (normalized): "${enteredVal}"`);
      
      const dbStatus = getSyncStatus();
      console.log(`[FIRESTORE QUERY STATUS]: Real-time sync status is currently: "${dbStatus}"`);

      const isOffline = typeof navigator !== "undefined" && !navigator.onLine || dbStatus === "offline";
      if (isOffline) {
        console.error(`[FIRESTORE UNREACHABLE]: Secure database is unreachable. Cannot verify identifier "${username.trim()}".`);
        setLoading(false);
        onAddToast("Authentication Failed", "Unable to connect to the CRM database", "error");
        return;
      }
      
      const users = getUsers();
      console.log(`[DATABASE QUERY]: Successfully retrieved ${users.length} total active users from database.`);

      const matchedUser = users.find(
        (u) => 
          (u.username || "").trim().toLowerCase().replace(/\s+/g, "") === enteredVal ||
          (u.email || "").trim().toLowerCase().replace(/\s+/g, "") === enteredVal ||
          (u.id || "").trim().toLowerCase().replace(/\s+/g, "") === enteredVal ||
          (u.employeeNumber || "").trim().toLowerCase().replace(/\s+/g, "") === enteredVal
      );

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

      if (matchedUser.role !== "councillor") {
        setLoading(false);
        onAddToast("Access Denied", "Please use the Secure Staff Access portal for administrator/technician accounts.", "warning");
        return;
      }

      if (matchedUser.status !== "active") {
        setLoading(false);
        onAddToast("Authentication Failed", "Account is inactive", "error");
        return;
      }

      if (isFirebaseEnabled && auth) {
        let hasAuthAccount = false;
        try {
          // Check server-side first to bypass email enumeration protection issues cleanly
          const checkRes = await fetch("/api/auth/check-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: matchedUser.email })
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            hasAuthAccount = !!checkData.exists;
          } else {
            hasAuthAccount = true; // Fallback
          }
        } catch (fetchErr: any) {
          console.warn("[FIRESTORE WARNING]: Could not connect to the check-status endpoint, using local fallback.");
          hasAuthAccount = true;
        }

        if (!hasAuthAccount) {
          setLoading(false);
          onAddToast("Authentication Failed", "Firebase authentication account is not configured", "error");
          return;
        }

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
            err.code === "auth/user-not-found" ||
            err.message?.includes("user-not-found")
          ) {
            setLoading(false);
            onAddToast("Authentication Failed", "Firebase authentication account is not configured", "error");
            return;
          }

          if (
            err.code === "auth/wrong-password" ||
            err.code === "auth/invalid-credential" ||
            err.message?.includes("wrong-password") ||
            err.message?.includes("invalid-credential")
          ) {
            setLoading(false);
            onAddToast("Authentication Failed", "Incorrect password", "error");
            return;
          }

          setLoading(false);
          onAddToast("Authentication Failed", `Authentication error: ${err.message}`, "error");
          return;
        }
      } else {
        setLoading(false);
        onAddToast("Authentication Failed", "Unable to connect to the CRM database", "error");
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
                onClick={async () => {
                  if (!username.trim()) {
                    onAddToast("Password Recovery", "Please enter your username first so we can identify your account.", "info");
                    return;
                  }
                  const dbStatus = getSyncStatus();
                  const isOffline = typeof navigator !== "undefined" && !navigator.onLine || dbStatus === "offline";
                  if (isOffline) {
                    onAddToast("Password Recovery", "Unable to connect to the database to request reset.", "error");
                    return;
                  }
                  const users = getUsers();
                  const matchedUser = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
                  if (!matchedUser) {
                    onAddToast("Password Recovery", "Username not registered in the CRM database.", "error");
                    return;
                  }
                  if (!isFirebaseEnabled || !auth) {
                    onAddToast("Password Recovery", "Firebase authentication is currently disabled.", "error");
                    return;
                  }
                  try {
                    await sendPasswordResetEmail(auth, matchedUser.email);
                    onAddToast("Reset Email Sent", `A password reset link has been successfully sent to ${matchedUser.email}. Please check your inbox.`, "success");
                  } catch (err: any) {
                    console.error("Password reset error:", err);
                    onAddToast("Password Recovery Failed", err.message || "Failed to send password reset email.", "error");
                  }
                }}
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
          </div>
        </div>

      </div>
    </div>
  );
}
