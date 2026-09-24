import { CheckCircle2, AlertCircle } from 'lucide-react';

const AdminToast = ({ toast, onClose }) => {
  if (!toast) {
    return null;
  }

  return (
    <div className="fixed top-5 right-5 z-[100]">
      <div
        className={`flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}
      >
        {toast.type === 'error' ? (
          <AlertCircle className="w-4 h-4" />
        ) : (
          <CheckCircle2 className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">{toast.message}</span>
        <button onClick={onClose} className="ml-2 text-xs opacity-70 hover:opacity-100">
          Close
        </button>
      </div>
    </div>
  );
};

export default AdminToast;
