import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Table = ({ 
  columns, 
  data, 
  pagination = true, 
  currentPage = 1, 
  totalPages = 1,
  onPageChange 
}) => {
  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full bg-white">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-slate-100 transition-colors hover:bg-sky-50/60"
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-4 text-slate-700">
                    {column.accessor ? row[column.accessor] : column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <div className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors 
                hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors 
                hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Table;