import React from 'react';
import Button from './Button';
import { cn } from '../../utils/cn';

export default function Table({
  headers = [],
  data = [],
  renderRow,
  isLoading = false,
  emptyText = 'No records found',
  totalCount = 0,
  currentPage = 1,
  pageSize = 10,
  onPageChange,
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className={cn('space-y-4 w-full', className)}>
      {/* Scrollable Table Container */}
      <div className="app-table-shell w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse table-auto">
            <thead className="app-table-head">
              <tr>
                {headers.map((h, i) => {
                  const label = typeof h === 'string' ? h : h.label;
                  const align = typeof h === 'object' && h.align ? h.align : 'text-left';
                  const width = typeof h === 'object' && h.width ? h.width : '';

                  return (
                    <th
                      key={i}
                      className={`table-header uppercase tracking-wide ${align} ${width}`}
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="app-table-body divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={headers.length} className="px-4 py-4">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : data.length > 0 ? (
                data.map((item, index) => renderRow(item, index))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-12 text-center text-slate-400 font-medium text-sm">
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Footer */}
      {totalCount > 0 && onPageChange && (
        <div className="app-table-pagination text-sm font-medium text-slate-600">
          <span>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="app-pill min-h-10 px-4 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
