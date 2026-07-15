import React from "react";
import { AlertTriangle, WifiOff, RefreshCw, Home, ShieldAlert, KeyRound, Hammer, HelpCircle } from "lucide-react";

export type ErrorType = 
  | "401" 
  | "403" 
  | "404" 
  | "500" 
  | "offline" 
  | "maintenance" 
  | "expired" 
  | "denied";

interface ErrorViewsProps {
  type: ErrorType;
  customMessage?: string;
  onHome: () => void;
  onRetry?: () => void;
}

export default function ErrorViews({ type, customMessage, onHome, onRetry }: ErrorViewsProps) {
  const renderIcon = () => {
    switch (type) {
      case "401":
        return <KeyRound className="text-amber-500 animate-bounce" size={48} />;
      case "403":
      case "denied":
        return <ShieldAlert className="text-red-600 animate-pulse" size={48} />;
      case "404":
        return <HelpCircle className="text-gov-blue" size={48} />;
      case "offline":
        return <WifiOff className="text-slate-500" size={48} />;
      case "maintenance":
        return <Hammer className="text-gov-yellow" size={48} />;
      default:
        return <AlertTriangle className="text-red-500" size={48} />;
    }
  };

  const getTitleAndMessage = () => {
    switch (type) {
      case "401":
        return {
          code: "401",
          title: "Session Authentication Required",
          desc: "You must establish a secure cryptographic session to view this municipal portal. Your security token is missing or invalid."
        };
      case "403":
        return {
          code: "403",
          title: "Access Forbidden",
          desc: "Your authenticated role level does not possess the clearance privileges required to enter this registry department."
        };
      case "404":
        return {
          code: "404",
          title: "Registry Resource Not Found",
          desc: "The digital document, complaint record, or archive folder you are attempting to locate cannot be found."
        };
      case "offline":
        return {
          code: "OFFLINE",
          title: "Network Connection Interrupted",
          desc: "The application is currently running in offline synchronization fallback. Please check your fiber or LTE connection."
        };
      case "maintenance":
        return {
          code: "MAINTENANCE",
          title: "System Upgrade in Progress",
          desc: "Thulamela's technical division is currently updating the databases. Access will be restored momentarily."
        };
      case "expired":
        return {
          code: "EXPIRED",
          title: "Secure Session Expired",
          desc: "Your administrative login window has elapsed for security compliance. Please reauthenticate."
        };
      case "denied":
        return {
          code: "DENIED",
          title: "Permission Denied",
          desc: "The transaction was intercepted and rejected. Security rules prevented writing or reading this record."
        };
      default:
        return {
          code: "500",
          title: "Internal Server Protocol Error",
          desc: "The gateway experienced an unexpected processing exception. Our software engineers have been dispatched to investigate."
        };
    }
  };

  const details = getTitleAndMessage();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
      <div className="max-w-md w-full bg-white shadow-2xl border border-slate-100 rounded-3xl p-8 text-center space-y-6">
        
        {/* Emblem-like Icon Container */}
        <div className="w-24 h-24 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto shadow-inner">
          {renderIcon()}
        </div>

        {/* Code & Title */}
        <div className="space-y-2">
          <span className="font-mono font-black text-xs uppercase tracking-widest text-gov-blue bg-blue-50 px-3 py-1 rounded-full">
            Status Code: {details.code}
          </span>
          <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight mt-3">
            {details.title}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto font-medium">
            {customMessage || details.desc}
          </p>
        </div>

        {/* Dynamic South African Flag Trim */}
        <div className="flex h-1.5 w-32 mx-auto rounded-full overflow-hidden shadow-sm">
          <div className="bg-red-600 w-1/5"></div>
          <div className="bg-blue-600 w-1/5"></div>
          <div className="bg-emerald-600 w-1/5"></div>
          <div className="bg-gov-yellow w-1/5"></div>
          <div className="bg-black w-1/5"></div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gov-blue hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
            >
              <RefreshCw size={13} className="animate-spin-slow" />
              <span>Retry Request</span>
            </button>
          )}
          
          <button
            onClick={onHome}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
          >
            <Home size={13} />
            <span>Return to Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
