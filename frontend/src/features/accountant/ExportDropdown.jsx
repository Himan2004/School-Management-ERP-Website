import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { exportToCSV, exportToExcel } from './exportUtils';

export const ExportDropdown = ({ data, filename, onExportPrep }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleExport = (type) => {
        let exportData = data;
        if (onExportPrep) {
            exportData = onExportPrep(data);
        }
        if (!exportData || exportData.length === 0) {
            return;
        }

        if (type === 'csv') {
            exportToCSV(exportData, filename);
        } else {
            exportToExcel(exportData, filename);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20"
                style={{ backgroundColor: '#223F74', borderColor: '#1A2F56' }}
            >
                <Download size={16} /> Export
            </button>
            
            {isOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                    <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#223F74] transition-colors"
                    >
                        <FileText size={16} className="text-slate-400" />
                        CSV File
                    </button>
                    <button
                        onClick={() => handleExport('excel')}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#223F74] transition-colors border-t border-slate-100"
                    >
                        <Table size={16} className="text-emerald-500" />
                        Excel File
                    </button>
                </div>
            )}
        </div>
    );
};
