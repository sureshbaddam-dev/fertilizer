import React from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import Button from './Button';

export default function DataTable({
  columns = [],
  data = [],
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
  pagination,
  onPageChange,
}) {
  return (
    <div className="app-table-shell flex flex-col justify-between">
      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="app-table-head">
            <tr>
              {columns.map((col) => {
                const isLeft = col.align === 'left' || col.header?.toLowerCase().includes('name') || col.header?.toLowerCase().includes('product');
                return (
                  <th
                    key={col.key || col.header}
                    className={`table-header align-middle uppercase tracking-wide ${isLeft ? 'text-left' : 'text-center'} ${col.className || ''}`}
                  >
                    <div className={`flex items-center gap-1 ${isLeft ? 'justify-start' : 'justify-center'}`}>
                      <span>{col.header}</span>
                      {col.sortable && <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-4 text-center align-middle">
                      <div className="h-4 bg-gray-100 rounded-md w-3/4 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length > 0 ? (
              data.map((row, rIdx) => (
                <tr
                  key={row._id || rIdx}
                  onClick={() => onRowClick && onRowClick(row, rIdx)}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-emerald-50/40' : 'hover:bg-emerald-50/20'}`}
                >
                  {columns.map((col, cIdx) => {
                    const isLeft = col.align === 'left' || col.header?.toLowerCase().includes('name') || col.header?.toLowerCase().includes('product');
                    return (
                      <td
                        key={cIdx}
                        className={`table-body px-3.5 py-4 align-middle ${isLeft ? 'text-left' : 'text-center'} ${col.cellClassName || ''}`}
                      >
                        {col.render ? col.render(row, rIdx) : row[col.accessorKey]}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="space-y-2 py-12 text-center align-middle text-gray-400">
                  <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200/80 mx-auto flex items-center justify-center text-gray-400">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE RESPONSIVE CARDS */}
      <div className="block md:hidden space-y-3 p-3">
        {isLoading ? (
          <div className="p-6 text-center text-gray-400 font-medium text-xs">
            Loading data...
          </div>
        ) : data.length > 0 ? (
          data.map((row, rIdx) => (
            <div
              key={row._id || rIdx}
              onClick={() => onRowClick && onRowClick(row, rIdx)}
              className={`bg-white border border-gray-200/90 rounded-2xl p-4 shadow-2xs space-y-2.5 transition-all ${
                onRowClick ? 'cursor-pointer hover:border-emerald-300' : ''
              }`}
            >
              {columns.map((col, cIdx) => {
                const label = col.header;
                const value = col.render ? col.render(row, rIdx) : row[col.accessorKey];

                if (cIdx === 0) {
                  return (
                    <div key={cIdx} className="pb-2 border-b border-gray-100 flex items-center justify-between">
                      <div className="text-xs font-bold text-gray-900">{value}</div>
                    </div>
                  );
                }

                return (
                  <div key={cIdx} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">{label}</span>
                    <div className="text-right font-medium text-gray-800 break-words">{value}</div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-400 text-xs italic bg-white rounded-2xl border border-gray-200">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="app-table-pagination text-sm text-gray-600 font-medium">
          <div>
            Showing <span className="font-bold text-gray-900">{data.length}</span> of{' '}
            <span className="font-bold text-gray-900">{pagination.total}</span> records
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="app-pill min-h-10 px-4">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
