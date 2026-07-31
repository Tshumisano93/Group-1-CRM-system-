import React, { useState, useEffect } from "react";
import { User, Complaint, Ward, Department, Technician } from "../types";
import { getComplaints, getWards, getDepartments, getTechnicians } from "../db";
import { ReportFilters, calculateReportMetrics, generateServiceDeliveryPDF, ReportMetrics } from "../utils/pdfReportGenerator";
import { FileText, Download, RotateCcw, Calendar, Filter, CheckCircle2, AlertTriangle, Clock, ShieldCheck, Building2, Wrench, MapPin } from "lucide-react";

interface ServiceDeliveryReportsProps {
  currentUser: User;
  onAddToast: (title: string, message: string, type: "success" | "info" | "warning" | "error") => void;
}

export default function ServiceDeliveryReports({ currentUser, onAddToast }: ServiceDeliveryReportsProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Filters state
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: "",
    endDate: "",
    departmentId: currentUser.role === "sub_admin" && currentUser.departmentId ? currentUser.departmentId : "All",
    wardNumber: "All",
    technicianId: "All",
    status: "All",
    priority: "All",
    category: "All"
  });

  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("thulamela_db_update", handleUpdate);
    return () => window.removeEventListener("thulamela_db_update", handleUpdate);
  }, []);

  const loadData = () => {
    const comp = getComplaints();
    const w = getWards();
    const d = getDepartments();
    const t = getTechnicians();
    setComplaints(comp);
    setWards(w);
    setDepartments(d);
    setTechnicians(t);
  };

  useEffect(() => {
    const calculated = calculateReportMetrics(complaints, departments, technicians, wards, filters, currentUser);
    setMetrics(calculated);
  }, [complaints, departments, technicians, wards, filters, currentUser]);

  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      departmentId: currentUser.role === "sub_admin" && currentUser.departmentId ? currentUser.departmentId : "All",
      wardNumber: "All",
      technicianId: "All",
      status: "All",
      priority: "All",
      category: "All"
    });
    onAddToast("Filters Reset", "All report filters have been reset to default values.", "info");
  };

  const handleDownloadPDF = () => {
    if (!metrics) return;
    try {
      generateServiceDeliveryPDF(metrics, filters, currentUser);
      onAddToast("PDF Generated", "Municipal Service Delivery Report successfully downloaded.", "success");
    } catch (error) {
      console.error("PDF generation failed:", error);
      onAddToast("Export Failed", "Unable to generate PDF report. Please verify record data.", "error");
    }
  };

  if (!metrics) return null;

  const categoriesList = [
    "Water Supply",
    "Electricity",
    "Roads",
    "Waste Collection",
    "Sanitation",
    "Storm Water",
    "Street Lighting",
    "Community Services",
    "Parks",
    "Infrastructure",
    "Housing"
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-gov-green to-emerald-800 text-white rounded-2xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 font-semibold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Thulamela Municipality Official Governance System
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
            Municipal Service Delivery Reports
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl">
            Generate and export comprehensive service delivery performance reports, SLA analytics, and ward statistics from real-time CRM records.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-gov-yellow text-slate-900 px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-yellow-400 shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          <Download size={18} /> Download Official PDF Report
        </button>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold uppercase text-xs tracking-wider">
            <Filter size={16} className="text-gov-blue" />
            <span>Report Configuration & Filters</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold transition-colors"
          >
            <RotateCcw size={14} /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Start Date */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Department</label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              disabled={currentUser.role === "sub_admin" && Boolean(currentUser.departmentId)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium disabled:opacity-60"
            >
              <option value="All">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Ward */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Ward</label>
            <select
              value={filters.wardNumber}
              onChange={(e) => setFilters({ ...filters, wardNumber: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            >
              <option value="All">Select ward</option>
              {wards.map((w) => (
                <option key={w.wardNumber} value={w.wardNumber.toString()}>
                  Ward {w.wardNumber} — {w.wardName}
                </option>
              ))}
            </select>
          </div>

          {/* Technician */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Technician</label>
            <select
              value={filters.technicianId}
              onChange={(e) => setFilters({ ...filters, technicianId: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            >
              <option value="All">Select technician</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.departmentName})</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            >
              <option value="All">Select status</option>
              <option value="New">New</option>
              <option value="Submitted">Submitted</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            >
              <option value="All">Select priority</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
              <option value="Emergency">Emergency</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-gov-green/30 focus:border-gov-green font-medium"
            >
              <option value="All">Select category</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <FileText className="text-gov-green" size={20} /> Executive Summary & Preview
          </h2>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Filtered Records: {metrics.total}
          </span>
        </div>

        {metrics.total === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <AlertTriangle className="mx-auto text-amber-500" size={36} />
            <p className="text-sm font-bold text-slate-800">No service delivery records found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No service delivery records were found for the selected filters and reporting period. Try resetting filters or choosing a different date range.
            </p>
          </div>
        ) : (
          <>
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Total Complaints</span>
                <p className="text-2xl font-black text-slate-900">{metrics.total}</p>
                <div className="text-[10px] text-gov-blue font-semibold">Active filtered scope</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Resolved / Closed</span>
                <p className="text-2xl font-black text-emerald-600">{metrics.resolved}</p>
                <div className="text-[10px] text-emerald-600 font-semibold">{metrics.total > 0 ? Math.round((metrics.resolved / metrics.total) * 100) : 0}% success rate</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">In Progress</span>
                <p className="text-2xl font-black text-amber-600">{metrics.inProgress}</p>
                <div className="text-[10px] text-amber-600 font-semibold">Active dispatch</div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Overall SLA %</span>
                <p className="text-2xl font-black text-blue-600">{metrics.slaComplianceRate}%</p>
                <div className="text-[10px] text-slate-500 font-semibold">Compliance index</div>
              </div>
            </div>

            {/* Department Performance Preview Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                  <Building2 size={16} className="text-gov-blue" /> Department Performance Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Received</th>
                      <th className="py-3 px-4">Resolved</th>
                      <th className="py-3 px-4">In Progress</th>
                      <th className="py-3 px-4">Pending</th>
                      <th className="py-3 px-4">SLA Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.departmentStats.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="py-3 px-4 font-bold text-slate-900">{d.departmentName}</td>
                        <td className="py-3 px-4 text-slate-700">{d.received}</td>
                        <td className="py-3 px-4 text-emerald-600 font-bold">{d.resolved}</td>
                        <td className="py-3 px-4 text-amber-600 font-bold">{d.inProgress}</td>
                        <td className="py-3 px-4 text-slate-600">{d.pending}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${d.sla >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {d.sla}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Technician Performance Preview Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-black text-slate-900 uppercase flex items-center gap-2">
                  <Wrench size={16} className="text-gov-blue" /> Technician Performance Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Technician</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Assigned</th>
                      <th className="py-3 px-4">Completed</th>
                      <th className="py-3 px-4">Outstanding</th>
                      <th className="py-3 px-4">SLA %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.technicianStats.map((t, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="py-3 px-4 font-bold text-slate-900">{t.technicianName}</td>
                        <td className="py-3 px-4 text-slate-600">{t.departmentName}</td>
                        <td className="py-3 px-4 text-slate-700">{t.assigned}</td>
                        <td className="py-3 px-4 text-emerald-600 font-bold">{t.completed}</td>
                        <td className="py-3 px-4 text-amber-600 font-bold">{t.outstanding}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                            {t.sla}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
