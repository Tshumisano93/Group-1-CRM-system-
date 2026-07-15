import React, { Component, ErrorInfo, ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in application:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-200">
              <ShieldAlert className="text-gov-yellow w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-100 text-amber-800 px-2.5 py-1 rounded">
                System Alert
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-3">
                SOMETHING WENT WRONG
              </h2>
              <p className="text-slate-600 text-xs leading-relaxed max-w-xs mx-auto">
                We apologize for the inconvenience. An unexpected interface error occurred in the Thulamela CRM client network.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Error Trace</p>
                <p className="text-[11px] font-mono text-red-600 bg-red-50/50 p-2 rounded-lg border border-red-100 break-words overflow-auto max-h-24">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full bg-gov-blue hover:bg-gov-blue/90 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all uppercase tracking-wider"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
