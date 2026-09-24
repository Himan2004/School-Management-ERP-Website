import React from 'react';
import { Users, ShieldAlert, MonitorPlay } from 'lucide-react';
import { cn } from '../../lib/utils';

const events = [
  {
    title: 'Vacation Meeting',
    date: '07 July 2024 - 07 July 2024',
    time: '09:10 AM - 10:50 PM',
    type: 'danger',  // Red border line
    icon: <ShieldAlert className="w-[18px] h-[18px]" />,
    attendees: ["https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"]
  },
  {
    title: 'Parents, Teacher Meet',
    date: '15 July 2024',
    time: '09:10 AM - 10:50 PM',
    type: 'info',    // Light Blue border line
    icon: <Users className="w-[18px] h-[18px]" />,
    attendees: ["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop"]
  },
  {
    title: 'Staff Meeting',
    date: '10 July 2024',
    time: '09:10 AM - 10:50 PM',
    type: 'primary', // Dark Blue border line
    icon: <MonitorPlay className="w-[18px] h-[18px]" />,
    attendees: ["https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"]
  },
];

const UpcomingEvents = () => {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm-soft h-full flex flex-col row-span-2">
      <h3 className="font-bold text-gray-800 text-[16px] mb-6">Upcoming Events</h3>
      
      <div className="flex-1 relative pl-2">
        {/* The continuous vertical timeline line */}
        <div className="absolute left-[34px] top-6 bottom-4 w-0.5 bg-gray-100 z-0"></div>
        
        <div className="space-y-5 relative z-10">
          {events.map((evt, idx) => (
            <div key={idx} className="flex gap-4 group">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-sm mt-1 transition-transform group-hover:scale-110",
                  evt.type === 'danger' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                  evt.type === 'info' ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' :
                  'bg-[#4361ee]/10 text-[#4361ee]'
                )}>
                  {evt.icon}
                </div>
              </div>
              
              <div className="flex-1 bg-white rounded-r-xl rounded-l-md p-4 pr-5 border shadow-sm-soft border-gray-100/80 hover:shadow-md-soft transition-all relative overflow-hidden group-hover:border-gray-200">
                {/* The colored left accent line from the screenshot */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  evt.type === 'danger' ? 'bg-[#ef4444]' :
                  evt.type === 'info' ? 'bg-[#0ea5e9]' :
                  'bg-[#4361ee]'
                )}></div>
                
                <h4 className="font-bold text-[14px] text-gray-800 mb-1 leading-snug group-hover:text-primary transition-colors">{evt.title}</h4>
                <div className="flex items-center gap-1.5 text-[12px] text-gray-500 font-medium mb-3">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {evt.date}
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded">
                    <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                    {evt.time}
                  </div>
                  
                   {/* Attendees avatars at the bottom right of the card block */}
                  <div className="flex -space-x-2">
                    {evt.attendees.map((img, i) => (
                      <img 
                        key={i} 
                        src={img} 
                        alt="attendee" 
                        className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm group-hover:-translate-y-0.5 transition-transform" 
                        style={{ zIndex: evt.attendees.length - i, transitionDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CalendarIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
    <line x1="16" x2="16" y1="2" y2="6"/>
    <line x1="8" x2="8" y1="2" y2="6"/>
    <line x1="3" x2="21" y1="10" y2="10"/>
  </svg>
)

const ClockIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default UpcomingEvents;
