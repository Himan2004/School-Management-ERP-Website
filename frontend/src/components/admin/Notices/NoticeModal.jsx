import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';

const NoticeModal = ({ notice, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: notice?.title || '',
    description: notice?.description || '',
    audience: notice?.audience || ['Students'],
    expiryDate: notice?.expiryDate || '',
    pinned: notice?.pinned || false,
    urgent: notice?.urgent || false,
    attachments: notice?.attachments || []
  });

  const audienceOptions = ['Students', 'Teachers', 'Parents', 'Staff'];

  const handleAudienceToggle = (audienceItem) => {
    setFormData(prev => ({
      ...prev,
      audience: prev.audience.includes(audienceItem)
        ? prev.audience.filter(a => a !== audienceItem)
        : [...prev.audience, audienceItem]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: notice?.id || Date.now().toString(),
      postedDate: notice?.postedDate || new Date().toISOString().split('T')[0],
      isNew: !notice
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold dark:text-white">
            {notice ? 'Edit Notice' : 'Create New Notice'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Notice Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter notice title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Description</label>
            <textarea
              rows="4"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Notice details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Audience</label>
            <div className="flex flex-wrap gap-2">
              {audienceOptions.map(aud => (
                <button
                  key={aud}
                  type="button"
                  onClick={() => handleAudienceToggle(aud)}
                  className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
                    formData.audience.includes(aud)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {aud}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Expiry Date</label>
            <input
              type="date"
              required
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900"
            />
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.pinned}
                onChange={(e) => setFormData({ ...formData, pinned: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm dark:text-gray-300">Pin this notice</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.urgent}
                onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm dark:text-gray-300">Mark as Urgent</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 dark:text-gray-300">Attachment</label>
            <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors cursor-pointer">
              <Upload className="mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload file</p>
              <input type="file" className="hidden" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              {notice ? 'Update Notice' : 'Create Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoticeModal;