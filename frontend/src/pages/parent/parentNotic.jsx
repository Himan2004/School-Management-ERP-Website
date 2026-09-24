import React, { useState } from 'react';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Paperclip,
  Calendar,
  Users,
  Pin,
  Bell
} from 'lucide-react';
import Card from '../../components/teacher/Card';

const Announcements = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const announcements = [
    {
      id: 1,
      title: 'Parent-Teacher Meeting',
      description: 'Annual parent-teacher meeting scheduled for next week. Please confirm your availability.',
      date: '2024-01-20T10:00:00',
      target: 'All Classes',
      attachments: ['schedule.pdf'],
      priority: 'high',
      pinned: true,
      author: 'Principal'
    },
    {
      id: 2,
      title: 'Mathematics Olympiad Registration',
      description: 'Registration for the upcoming Mathematics Olympiad is now open. Interested students please submit names by Friday.',
      date: '2024-01-19T14:30:00',
      target: 'Grade 10-12',
      attachments: ['guidelines.pdf', 'registration_form.docx'],
      priority: 'medium',
      pinned: false,
      author: 'Math Department'
    },
    {
      id: 3,
      title: 'School Holiday Notice',
      description: 'School will remain closed on Monday due to national holiday.',
      date: '2024-01-18T09:00:00',
      target: 'All Classes',
      attachments: [],
      priority: 'low',
      pinned: false,
      author: 'Administration'
    },
    {
      id: 4,
      title: 'Science Fair 2024',
      description: 'Annual Science Fair will be held on February 10th. Start preparing your projects.',
      date: '2024-01-17T11:15:00',
      target: 'Grade 9-12',
      attachments: ['guidelines.pdf', 'topics_list.docx'],
      priority: 'high',
      pinned: true,
      author: 'Science Department'
    }
  ];

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notic Board</h1>
          <p className="mt-1 text-gray-500">Posted Notic from School</p>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search announcements..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-gray-700
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex space-x-4">
              <button className="flex items-center rounded-lg border border-gray-200 px-4 py-2 hover:bg-gray-50 
                transition-colors">
                    
                <select  
                    className="bg-transparent text-sm font-semibold text-slate-600 outline-none cursor-pointer pr-2"
                >
                    <option value="all">All Notices</option>
                    <option value="academic">Academic</option>
                    <option value="exam">Exams</option>
                    <option value="event">Events</option>
                </select>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Announcements Feed */}
      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} hover={true}>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    announcement.priority === 'high' 
                      ? 'bg-red-100' 
                      : 'bg-blue-100'
                  }`}>
                    <Megaphone className={`w-5 h-5 ${
                      announcement.priority === 'high' 
                        ? 'text-red-600' 
                        : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {announcement.title}
                      </h3>
                      {announcement.pinned && (
                        <Pin className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                        ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(announcement.date).toLocaleString()}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        {announcement.target}
                      </span>
                      <span>By: {announcement.author}</span>
                    </div>
                  </div>
                </div>
                
                
              </div>

              {/* Description */}
              <p className="mb-4 text-gray-600">
                {announcement.description}
              </p>

              {/* Attachments */}
              {announcement.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {announcement.attachments.map((file, index) => (
                    <button key={index} 
                      className="flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200 
                        transition-colors">
                      <Paperclip className="w-3 h-3 mr-1" />
                      {file}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="p-6">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">Create Announcement</h2>
              
              <form className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 bg-white p-3 text-gray-700 focus:outline-none focus:ring-2 
                      focus:ring-blue-500"
                    placeholder="Enter announcement title"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    rows="4"
                    className="w-full rounded-lg border border-gray-200 bg-white p-3 text-gray-700 focus:outline-none focus:ring-2 
                      focus:ring-blue-500"
                    placeholder="Enter announcement description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Target Audience
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-gray-700 focus:outline-none focus:ring-2 
                        focus:ring-blue-500"
                    >
                      <option>All Classes</option>
                      <option>Grade 10-A</option>
                      <option>Grade 11-B</option>
                      <option>Grade 12-A</option>
                      <option>Teachers Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Priority
                    </label>
                    <select
                      className="w-full rounded-lg border border-gray-200 bg-white p-3 text-gray-700 focus:outline-none focus:ring-2 
                        focus:ring-blue-500"
                    >
                      <option>High</option>
                      <option>Medium</option>
                      <option>Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Attachments
                  </label>
                  <div className="border-2 border-dashed border-gray-300 
                    rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 
                    transition-colors">
                    <input type="file" multiple className="hidden" />
                    <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600">
                      Drag and drop files here or click to browse
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="pinAnnouncement" className="rounded" />
                  <label htmlFor="pinAnnouncement" className="text-sm text-gray-700">
                    Pin this announcement
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="sendNotification" className="rounded" />
                  <label htmlFor="sendNotification" className="text-sm text-gray-700">
                    Send push notification
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-lg border border-gray-200 px-6 py-2 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 
                      text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Post Announcement
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
