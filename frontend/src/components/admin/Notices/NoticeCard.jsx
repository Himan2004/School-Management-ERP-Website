import React from 'react';
import { Pin, PinOff, Edit, Trash2, Paperclip, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const NoticeCard = ({ notice, onPin, onDelete, onEdit }) => {
  const isExpired = new Date(notice.expiryDate) < new Date();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all group ${
      notice.pinned ? 'border-indigo-200 dark:border-indigo-800' : 'border-gray-100 dark:border-slate-700'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-2 flex-wrap">
          {notice.pinned && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium">
              <Pin size={12} /> Pinned
            </span>
          )}
          {notice.isNew && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium">
              New
            </span>
          )}
          {notice.urgent && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium">
              <AlertCircle size={12} /> Urgent
            </span>
          )}
          {isExpired && !notice.pinned && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-lg text-xs">
              Expired
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPin(notice.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title={notice.pinned ? 'Unpin' : 'Pin'}
          >
            {notice.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <button
            onClick={() => onEdit(notice)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onDelete(notice.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-lg dark:text-white mb-2">{notice.title}</h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">{notice.description}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        {notice.audience.map(aud => (
          <span key={aud} className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded-lg text-xs">
            {aud}
          </span>
        ))}
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <span>📅 {format(new Date(notice.postedDate), 'MMM dd, yyyy')}</span>
        <span>⏰ {format(new Date(notice.expiryDate), 'MMM dd, yyyy')}</span>
      </div>

      {notice.attachments && notice.attachments.length > 0 && (
        <div className="mt-3 flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Paperclip size={14} />
          <span className="text-xs">{notice.attachments.length} attachment(s)</span>
        </div>
      )}
    </div>
  );
};

export default NoticeCard;