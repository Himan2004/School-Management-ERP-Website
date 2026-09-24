import React, { useState } from 'react';
import { 
  Calendar, User, MapPin, 
  ChevronLeft, ChevronRight, Download,
  BookOpen, GraduationCap
} from 'lucide-react';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';

/**
 * SharedTimetableViewer
 * 
 * A fully dynamic timetable viewer. All time slots, days, and schedule entries
 * are driven entirely by the `data` prop from the API. Nothing is hardcoded.
 * 
 * data shape: {
 *   subjects: [{ id, name, color, teacher, room }],
 *   schedule: [{ day, time, subject, teacher, room, className, type, color, ... }],
 *   days: string[],          // e.g. ["Monday","Tuesday",...]
 *   timeSlots: string[],     // e.g. ["09:00 - 10:00","10:00 - 11:00",...]
 *   breakSlots: string[]     // optional — slots that are breaks, e.g. ["12:00 - 12:30"]
 * }
 */
const SharedTimetableViewer = ({ 
  data, 
  onCellClick, 
  onExport,
  title = "Class Timetable",
  subtitle = "Your weekly class schedule",
  readOnly = true
}) => {
  const [viewType, setViewType] = useState('week');
  const [filterType, setFilterType] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // ── Derived data (all from API, no hardcoding) ──────────────────────────
  const scheduleData = data?.schedule || [];
  const subjectsData = data?.subjects || [];
  const timeSlotsData = data?.timeSlots || [];
  const breakSlotsData = data?.breakSlots || [];

  // Days: use API days, fallback to deriving unique days from schedule
  const daysData = data?.days?.length > 0
    ? data.days
    : [...new Set(scheduleData.map(s => s.day))];

  // Subjects dropdown
  const dropdownSubjects = subjectsData.length > 0
    ? subjectsData
    : [...new Map(scheduleData.map(s => [s.subject, { id: s.subject, name: s.subject }])).values()];

  // Check if a time slot is a break
  const isBreakSlot = (slot) => {
    if (breakSlotsData.includes(slot)) return true;
    const lower = slot.toLowerCase();
    return lower.includes("lunch") || lower.includes("break") || lower.includes("recess");
  };

  // Period numbering (skips breaks)
  const getPeriodInfo = (slot, index) => {
    if (isBreakSlot(slot)) {
      return { title: "Lunch", subtitle: slot, isBreak: true };
    }
    let periodNum = 0;
    for (let i = 0; i <= index; i++) {
      if (!isBreakSlot(timeSlotsData[i])) periodNum++;
    }
    return { title: `Period ${periodNum}`, subtitle: slot, isBreak: false };
  };

  // Day view: get schedule for selected date
  const getDaySchedule = () => {
    const dayName = format(selectedDate, 'EEEE');
    return scheduleData.filter(
      item => item.day.toLowerCase() === dayName.toLowerCase() &&
        (filterType === 'all' || item.subject === filterType)
    );
  };

  // Parse start hour from a time slot string like "09:00 - 10:00"
  const parseStartHour = (timeStr) => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    return parseInt(match[1], 10);
  };

  // Generate hourly time labels for day view from the schedule's time range
  const getDayHourSlots = () => {
    if (timeSlotsData.length === 0) return [];
    const hours = timeSlotsData.map(t => parseStartHour(t));
    // Also get the end hour from the last slot
    const lastSlot = timeSlotsData[timeSlotsData.length - 1];
    const endMatch = lastSlot.match(/-\s*(\d{1,2}):(\d{2})/);
    const endHour = endMatch ? parseInt(endMatch[1], 10) : Math.max(...hours) + 1;
    const minHour = Math.min(...hours);
    const maxHour = endHour;
    const slots = [];
    for (let h = minHour; h <= maxHour; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  };

  // View toggle style
  const viewBtnCls = (v) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition-all ${viewType === v
      ? 'bg-[#223F74] text-white shadow-sm'
      : 'bg-white text-[#223F74] border border-gray-200 hover:bg-gray-50'}`;

  const handleCellClick = (item) => {
    if (onCellClick) onCellClick(item);
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-3">
        {/* View Toggles */}
        <div className="flex gap-2">
          <button className={viewBtnCls('day')} onClick={() => setViewType('day')}>Day View</button>
          <button className={viewBtnCls('week')} onClick={() => setViewType('week')}>Week View</button>
        </div>

        {/* Date Navigation (both views) */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate(subDays(selectedDate, viewType === 'week' ? 7 : 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#223F74]" />
          </button>
          <button onClick={() => setSelectedDate(addDays(selectedDate, viewType === 'week' ? 7 : 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-[#223F74]" />
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#223F74] ml-1">
            <Calendar size={16} className="text-gray-400" />
            {viewType === 'week'
              ? `${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'EEEE, d MMMM yyyy')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'EEEE, d MMMM yyyy')}`
              : format(selectedDate, 'EEEE, d MMMM yyyy')
            }
          </div>
        </div>

        {/* Subject Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-4 py-2.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#223F74]/20"
        >
          <option value="all">All Subjects</option>
          {dropdownSubjects.map(sub => (
            <option key={sub.id || sub.name} value={sub.name}>{sub.name}</option>
          ))}
        </select>
      </div>

      {/* ═══════════════════ WEEK VIEW ═══════════════════ */}
      {viewType === 'week' && (
        <>
          {/* Header Bar */}
          <div className="bg-[#EEF1F8] border border-gray-200 rounded-t-[20px] px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-[#223F74] font-bold text-xs tracking-[0.15em] uppercase">
              {title}
            </h3>
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#223F74] hover:bg-gray-50 transition-colors shadow-sm"
              >
                <Download size={14} />
                EXPORT CSV
              </button>
            )}
          </div>

          {/* Grid Table */}
          <div className="overflow-x-auto border-x border-b border-gray-200 rounded-b-[20px] bg-white shadow-sm -mt-4">
            <div className="min-w-[1000px]">
              {/* Column Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: `150px repeat(${daysData.length}, minmax(0, 1fr))` }}>
                <div className="bg-[#223F74] text-white py-3 px-4 font-bold text-[11px] tracking-[0.1em] uppercase border-r border-[#1a3360] flex items-center justify-center">
                  Period / Time
                </div>
                {daysData.map((d) => (
                  <div key={d} className="bg-[#223F74] text-white py-3 px-4 font-bold text-[11px] tracking-[0.1em] uppercase text-center border-r border-[#1a3360] last:border-r-0 flex items-center justify-center">
                    {d}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {timeSlotsData.map((slot, index) => {
                const info = getPeriodInfo(slot, index);
                return (
                  <div key={slot} style={{ display: 'grid', gridTemplateColumns: `150px repeat(${daysData.length}, minmax(0, 1fr))` }} className="border-b border-gray-100 last:border-b-0">
                    <div className="py-4 px-4 border-r border-gray-100 bg-white flex flex-col justify-center">
                      <span className="font-bold text-[#1D1D1F] text-[13px] leading-tight">{info.title}</span>
                      <span className="text-[11px] text-gray-400 mt-0.5">{info.subtitle}</span>
                      {info.isBreak && (
                        <span className="mt-2 text-[9px] font-extrabold bg-rose-100 text-rose-600 px-2.5 py-0.5 rounded w-fit uppercase tracking-wider">Break</span>
                      )}
                    </div>
                    {info.isBreak ? (
                      <div style={{ gridColumn: `span ${daysData.length}` }} className="bg-[#FAFBFD]" />
                    ) : (
                      daysData.map((day) => {
                        const classItem = scheduleData.find(
                          (s) => s.day.toLowerCase() === day.toLowerCase() && s.time === slot && (filterType === 'all' || s.subject === filterType)
                        );
                        return (
                          <div key={`${day}-${slot}`} className="p-1.5 border-r border-gray-100 last:border-r-0 bg-white">
                            {classItem ? (
                              <div className="h-full rounded-xl bg-[#F0F2FA] border border-[#E0E4F0] p-3 flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all" onClick={() => handleCellClick(classItem)}>
                                <h4 className="font-bold text-[#3730a3] text-[13px] leading-tight">{classItem.subject}</h4>
                                <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-500 font-medium">
                                  <GraduationCap size={12} className="text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{classItem.className || classItem.class || 'Class'}</span>
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                    <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                                    <span>{classItem.room || 'Room'}</span>
                                  </div>
                                  <span className="text-[10px] font-bold text-indigo-600">{classItem.type || 'Theory'}</span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}


      {/* ═══════════════════ DAY VIEW (Calendar-style) ═══════════════════ */}
      {viewType === 'day' && (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* Day column header */}
          <div className="border-b border-gray-200 text-center py-2">
            <span className="text-sm font-bold text-[#223F74] uppercase tracking-wider">
              {format(selectedDate, 'EEE')}, {format(selectedDate, 'dd/MM')}
            </span>
          </div>

          {/* ALL DAY row */}
          <div className="flex border-b border-gray-200">
            <div className="w-[80px] flex-shrink-0 py-3 px-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right pr-3 border-r border-gray-200">
              All Day
            </div>
            <div className="flex-1 min-h-[40px]" />
          </div>

          {/* Time Slot Rows */}
          {timeSlotsData.map((slot, index) => {
            const info = getPeriodInfo(slot, index);
            const dayName = format(selectedDate, 'EEEE');
            const classesInSlot = scheduleData.filter(
              item => item.day.toLowerCase() === dayName.toLowerCase() &&
                item.time === slot &&
                (filterType === 'all' || item.subject === filterType)
            );

            // Extract the start time label (e.g. "09:00" from "09:00 - 10:00")
            const startLabel = slot.split('-')[0].trim();

            return (
              <div key={slot} className="flex border-b border-gray-100 last:border-b-0">
                {/* Time label */}
                <div className="w-[80px] flex-shrink-0 py-4 px-2 text-[12px] font-bold text-[#223F74] text-right pr-3 border-r border-gray-200">
                  {startLabel}
                </div>

                {/* Content area */}
                <div className="flex-1 relative min-h-[70px]">
                  {/* Dashed midpoint line */}
                  <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-200" />

                  {info.isBreak ? (
                    <div className="relative z-10 p-2">
                      <span className="text-[10px] font-extrabold bg-rose-100 text-rose-600 px-2.5 py-1 rounded uppercase tracking-wider">
                        Break — {info.title}
                      </span>
                    </div>
                  ) : classesInSlot.length > 0 ? (
                    <div className="relative z-10 p-1.5 flex flex-col gap-1.5">
                      {classesInSlot.map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg p-3 cursor-pointer hover:shadow-md transition-all border"
                          style={{
                            backgroundColor: `${item.color || '#4f46e5'}12`,
                            borderColor: `${item.color || '#4f46e5'}30`,
                          }}
                          onClick={() => handleCellClick(item)}
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-[13px]" style={{ color: item.color || '#3730a3' }}>
                              {item.subject}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ backgroundColor: `${item.color || '#4f46e5'}20`, color: item.color || '#4f46e5' }}>
                              {item.type || 'Theory'}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-500">
                            <span className="flex items-center gap-1"><User size={11} /> {item.teacher}</span>
                            <span className="flex items-center gap-1"><MapPin size={11} /> {item.room}</span>
                            <span className="text-gray-400">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharedTimetableViewer;
