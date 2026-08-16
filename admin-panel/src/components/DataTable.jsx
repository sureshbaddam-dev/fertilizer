import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  activeFilter,
  onFilterChange,
  onRowClick,
}) {
  const [search, setSearch] = useState('');
  const [internalFilter, setInternalFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const currentActiveFilter = activeFilter !== undefined ? activeFilter : internalFilter;

  const handleFilterSelect = (val) => {
    setInternalFilter(val);
    if (onFilterChange) onFilterChange(val);
  };

  const filteredData = data.filter((row) => {
    const rowStr = JSON.stringify(row).toLowerCase();
    return rowStr.includes(search.toLowerCase());
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs font-sans antialiased text-slate-800">
      {/* Header Filters & Search */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 font-medium"
          />
        </div>

        {filterOptions.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full no-scrollbar">
            {filterOptions.map((opt) => {
              const isSelected = currentActiveFilter === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => handleFilterSelect(opt.value)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key || col.header} className="p-4">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-400 font-semibold">
                  No records matching search criteria.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row._id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors ${
                    onRowClick ? 'hover:bg-slate-50 cursor-pointer' : 'hover:bg-slate-50'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key || col.header} className="p-4 font-medium">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-semibold">
          Showing {paginatedData.length} of {filteredData.length} entries
        </span>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
