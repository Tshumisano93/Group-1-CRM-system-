import React from "react";

interface ServiceFiltersProps {
  onFilterChange: (filters: any) => void;
  onSortChange: (sort: string) => void;
}

export default function ServiceFilters({ onFilterChange, onSortChange }: ServiceFiltersProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <select onChange={(e) => onFilterChange({ ward: e.target.value })} className="border rounded-lg p-2 text-base">
            <option value="">All Wards</option>
            {Array.from({ length: 41 }, (_, i) => i + 1).map(w => <option key={w} value={w}>Ward {w}</option>)}
        </select>
        <select onChange={(e) => onFilterChange({ status: e.target.value })} className="border rounded-lg p-2 text-base">
            <option value="">All Statuses</option>
            <option value="Operational">Operational</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Emergency">Emergency</option>
            <option value="Resolved">Resolved</option>
        </select>
        <select onChange={(e) => onSortChange(e.target.value)} className="border rounded-lg p-2 text-base">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="priority">Highest Priority</option>
        </select>
    </div>
  );
}
