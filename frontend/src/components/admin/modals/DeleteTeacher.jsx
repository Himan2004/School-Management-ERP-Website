import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, AlertTriangle, UserX } from 'lucide-react';

const DeleteTeacherModal = ({ teacher, onClose, onConfirm }) => {
    if (!teacher) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-red-600 to-rose-600 px-7 py-5">
                        <div
                            className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                        />
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                                    <Trash2 className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Delete Teacher</h3>
                                    <p className="text-red-200 text-xs mt-0.5">This action is permanent</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        {/* Warning box */}
                        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-6">
                            <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-red-800 mb-0.5">Are you absolutely sure?</p>
                                <p className="text-xs text-red-600 leading-relaxed">
                                    You are about to permanently delete{' '}
                                    <span className="font-bold">{teacher.name}</span>
                                    {teacher.teacherId && (
                                        <span className="font-mono"> ({teacher.teacherId})</span>
                                    )}
                                    . All associated data will be removed and cannot be recovered.
                                </p>
                            </div>
                        </div>

                        {/* Teacher info card */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                <UserX className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{teacher.name}</p>
                                <p className="text-xs text-gray-500">{teacher.email}</p>
                            </div>
                            {teacher.assignedClass && (
                                <span className="ml-auto px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-lg font-medium">
                                    {teacher.assignedClass}
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 text-sm font-medium transition-all"
                            >
                                Keep Teacher
                            </button>
                            <button
                                onClick={onConfirm}
                                className="group relative flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-red-200 overflow-hidden"
                            >
                                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-12 pointer-events-none" />
                                <Trash2 className="w-4 h-4" />
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DeleteTeacherModal;