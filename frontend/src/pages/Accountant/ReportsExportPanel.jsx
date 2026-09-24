import React, { useState, useEffect } from 'react';
import { FileText, Eye } from 'lucide-react';
import { DataTable, Button, Modal, openModal } from '../../components/shared/Common_Components';
import { getAllTransactions } from '../../services/AccountantDashboard';
import { getDuesList } from '../../services/accountantDuesApi';
import { toast } from 'react-hot-toast';

const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

const transactionColumns = [
    { key: 'transactionId', label: 'Transaction ID' },
    { key: 'receiptNo', label: 'Receipt No.' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'date', label: 'Date', render: (val) => new Date(val).toLocaleDateString('en-IN') },
    { key: 'mode', label: 'Payment Method' },
    { key: 'amount', label: 'Amount', render: (val) => formatCurrency(val) },
    { key: 'status', label: 'Status' },
    { key: 'collectedBy', label: 'Collected By' }
];

const duesColumns = [
    { key: 'studentId', label: 'Student ID' },
    { key: 'name', label: 'Student Name' },
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'feeType', label: 'Fee Type' },
    { key: 'dueAmount', label: 'Due Amount', render: (v) => <span className="font-bold text-rose-600">{formatCurrency(v)}</span> },
    { key: 'dueDate', label: 'Due Date', render: (val) => new Date(val).toLocaleDateString('en-IN') },
    { key: 'status', label: 'Status' }
];

const feeCollectionColumns = [
    { key: 'receiptNo', label: 'Receipt Number' },
    { key: 'studentName', label: 'Student Name' },
    { key: 'class', label: 'Class' },
    { key: 'section', label: 'Section' },
    { key: 'feeCategory', label: 'Fee Category' },
    { key: 'date', label: 'Payment Date', render: (val) => new Date(val).toLocaleDateString('en-IN') },
    { key: 'amount', label: 'Amount', render: (val) => formatCurrency(val) },
    { key: 'mode', label: 'Payment Method' },
    { key: 'transactionId', label: 'Transaction ID' },
    { key: 'status', label: 'Status' }
];

export const ReportsExportPanel = ({ schoolId }) => {
    const [activeTab, setActiveTab] = useState('transactions');
    const [transactions, setTransactions] = useState([]);
    const [dues, setDues] = useState([]);
    const [feeCollections, setFeeCollections] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedRecord, setSelectedRecord] = useState(null);

    const loadData = async () => {
        if (!schoolId) return;

        Promise.all([
            getAllTransactions(schoolId).catch(() => ({ data: { data: { transactions: [] } } })),
            getDuesList(schoolId, { limit: 1000 }).catch(() => ({ data: { data: { students: [] } } }))
        ]).then(([txnsRes, duesRes]) => {
            const fetchedTxns = txnsRes?.data?.data?.transactions || (Array.isArray(txnsRes?.data?.data) ? txnsRes?.data?.data : []);
            const fetchedDues = duesRes?.data?.data?.students || (Array.isArray(duesRes?.data?.data) ? duesRes?.data?.data : []);
            
            const mappedTxns = fetchedTxns.map(t => ({
                ...t,
                transactionId: t.id,
                receiptNo: t.receiptNo || t.id,
                studentName: t.student || t.studentName,
                date: t.timestamp || t.date || new Date().toISOString(),
                collectedBy: t.collectedBy || 'Accountant'
            }));

            const mappedDues = fetchedDues.map(d => ({
                ...d,
                studentId: d.admissionNo || d.id,
                dueAmount: d.dues,
                feeType: d.feeType || 'Tuition Fee',
                dueDate: d.dueDate || new Date().toISOString()
            }));

            const mappedFeeCollections = fetchedTxns.map(t => {
                const parts = (t.class || '').split('-');
                return {
                    ...t,
                    receiptNo: t.receiptNo || t.id,
                    studentName: t.student || t.studentName,
                    class: parts[0] || 'N/A',
                    section: parts[1] || 'N/A',
                    feeCategory: t.feeCategory || 'Tuition Fee',
                    date: t.timestamp || t.date || new Date().toISOString(),
                    transactionId: t.id
                };
            });

            setTransactions(mappedTxns);
            setDues(mappedDues);
            setFeeCollections(mappedFeeCollections);
        }).catch(err => console.error(err));
    };

    useEffect(() => {
        loadData();
    }, [schoolId]);

    const handleRefresh = async () => {
        setRefreshKey(prev => prev + 1);
        await loadData();
        toast.success("Data refreshed and filters reset");
    };

    const handleViewRecord = (row) => {
        setSelectedRecord(row);
        openModal('view-record-modal');
    };

    const actions = [
        { tooltip: 'View', icon: <Eye size={16} />, onClick: handleViewRecord }
    ];

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm mt-8">
            <h3 className="font-black text-xl text-slate-800 dark:text-white tracking-tight mb-6 flex items-center gap-2">
                <FileText size={24} className="text-blue-600" />
                Report Generation Hub
            </h3>

            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                {[
                    { id: 'transactions', label: 'Transaction Logs' },
                    { id: 'dues', label: 'Due Reports' },
                    { id: 'feeCollection', label: 'Fee Collection Report' }
                ].map(tab => (
                    <div key={tab.id} className="w-auto">
                        <Button
                            text={tab.label}
                            variant={activeTab === tab.id ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab(tab.id)}
                            size={12}
                        />
                    </div>
                ))}
            </div>

            <div id={`export-table-${activeTab}`} className="relative min-h-[400px]">
                {activeTab === 'transactions' && (
                    <div className="space-y-4">
                        <DataTable 
                            key={refreshKey}
                            columns={transactionColumns} 
                            rows={transactions}
                            actions={actions}
                            searchable
                            date={true}
                            filters={[{ title: 'Status', key: 'status', type: 'toggle', options: ['Success', 'Pending', 'Failed'] }]}
                            title="Transaction Logs"
                            pageSizeOptions={[5, 10, 20]}
                            pageSize={5}
                            exportable
                            exportFileName="transaction-logs"
                            onRefresh={handleRefresh}
                        />
                    </div>
                )}

                {activeTab === 'dues' && (
                    <div className="space-y-4">
                        <DataTable 
                            key={refreshKey}
                            columns={duesColumns} 
                            rows={dues}
                            actions={actions}
                            searchable
                            date={true}
                            filters={[{ title: 'Status', key: 'status', type: 'toggle', options: ['Active', 'Inactive'] }]}
                            title="Pending Dues"
                            pageSizeOptions={[5, 10, 20]}
                            pageSize={5}
                            exportable
                            exportFileName="due-reports"
                            onRefresh={handleRefresh}
                        />
                    </div>
                )}

                {activeTab === 'feeCollection' && (
                    <div className="space-y-6">
                        <DataTable 
                            key={refreshKey}
                            columns={feeCollectionColumns} 
                            rows={feeCollections}
                            actions={actions}
                            searchable
                            date={true}
                            filters={[{ title: 'Status', key: 'status', type: 'toggle', options: ['Success', 'Pending', 'Failed'] }]}
                            title="Fee Collections Report"
                            pageSizeOptions={[5, 10, 20]}
                            pageSize={5}
                            exportable
                            exportFileName="fee-collections-report"
                            onRefresh={handleRefresh}
                        />
                    </div>
                )}
            </div>

            <Modal id="view-record-modal" title="Record Details" size="md">
                {selectedRecord ? (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                            {Object.entries(selectedRecord).map(([key, value]) => {
                                const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                const displayValue = typeof value === 'number' && key.toLowerCase().includes('amount') 
                                    ? formatCurrency(value)
                                    : (key === 'date' || key === 'dueDate') && value 
                                    ? new Date(value).toLocaleDateString('en-IN')
                                    : String(value || 'N/A');
                                    
                                return (
                                    <div key={key} className="flex flex-col bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{formattedKey}</span>
                                        <span className="text-sm font-semibold text-slate-800 break-words">{displayValue}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-500">No record selected</div>
                )}
            </Modal>
        </div>
    );
};

