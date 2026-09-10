import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Filter,
  Sparkles,
  Award,
  Layers,
  CalendarCheck,
  ExternalLink,
  Info,
  X,
  User,
  Trash2,
} from 'lucide-react';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { ScheduleActivity, ClassTask, PersonalTask, ActiveView, CATSection } from '../../types';
import { TaskDetailModal } from '../tasks/TaskDetailModal';

interface StudyCalendarProps {
  setActiveView: (view: ActiveView) => void;
}

export const StudyCalendar: React.FC<StudyCalendarProps> = ({ setActiveView }) => {
  const { scheduleActivities, tasks, personalTasks, taskProgress, toggleTaskCompletion, deleteTask } = useTasks();
  const { isAdmin } = useAuth();

  // Selected date state (defaults to today in schedule: 2026-09-10)
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-10');
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<ClassTask | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [filterSection, setFilterSection] = useState<'ALL' | CATSection | 'LECTURES' | 'TASKS'>('ALL');
  const [selectedActivity, setSelectedActivity] = useState<ScheduleActivity | null>(null);

  // Month navigation (Fixed around September 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // 8 is September (0-indexed)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Build calendar matrix for September 2026
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate(); // 30 for Sept
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const mStr = String(currentMonth).padStart(2, '0');
      days.push({
        dateStr: `${currentYear}-${mStr}-${String(d).padStart(2, '0')}`,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dStr = String(d).padStart(2, '0');
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === '2026-09-10',
      });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const mStr = String(currentMonth + 2).padStart(2, '0');
      days.push({
        dateStr: `${currentYear}-${mStr}-${String(i).padStart(2, '0')}`,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Aggregate items by date
  const eventsByDate = useMemo(() => {
    const map: Record<
      string,
      {
        lectures: ScheduleActivity[];
        classTasks: ClassTask[];
        personal: PersonalTask[];
      }
    > = {};

    // 1. Lectures
    scheduleActivities.forEach((act) => {
      if (!map[act.date]) map[act.date] = { lectures: [], classTasks: [], personal: [] };
      if (filterSection === 'ALL' || filterSection === 'LECTURES' || filterSection === act.section) {
        map[act.date].lectures.push(act);
      }
    });

    // 2. Class Tasks
    tasks.forEach((t) => {
      const date = t.deadlineDate;
      if (!map[date]) map[date] = { lectures: [], classTasks: [], personal: [] };
      if (filterSection === 'ALL' || filterSection === 'TASKS' || filterSection === t.section) {
        map[date].classTasks.push(t);
      }
    });

    // 3. Personal Tasks
    personalTasks.forEach((pt) => {
      const date = pt.deadlineDate;
      if (!map[date]) map[date] = { lectures: [], classTasks: [], personal: [] };
      if (filterSection === 'ALL' || filterSection === 'TASKS' || (pt.section !== 'General' && filterSection === pt.section)) {
        map[date].personal.push(pt);
      }
    });

    return map;
  }, [scheduleActivities, tasks, personalTasks, filterSection]);

  // Section badge color helper
  const getSectionBadgeStyle = (section: string) => {
    switch (section) {
      case 'VARC':
        return 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400';
      case 'DILR':
        return 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300';
      case 'QUANTS':
      case 'QUANT':
        return 'bg-violet-950/70 border-violet-500/40 text-violet-300';
      case 'BREAK':
        return 'bg-amber-950/70 border-amber-500/40 text-amber-300';
      case 'EVENT':
        return 'bg-purple-950/70 border-purple-500/40 text-purple-300';
      default:
        return 'bg-zinc-900 border-zinc-700 text-zinc-300';
    }
  };

  // Selected date events
  const selectedDateEvents = eventsByDate[selectedDate] || { lectures: [], classTasks: [], personal: [] };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200 text-zinc-100">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl glass-panel border border-white/[0.08] shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase tracking-wider">
              Batch B-CAT2701
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
              Target: CAT 2027
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-indigo-400" />
            CAT Master Schedule & Calendar
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Canonical lecture timetable, class assignments, personal study targets, and diagnostic tests.
          </p>
        </div>

        {/* View Mode & Today Jumper */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => {
              setCurrentYear(2026);
              setCurrentMonth(8);
              setSelectedDate('2026-09-10');
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Today (Sept 10)</span>
          </button>

          <div className="bg-zinc-900 p-1 rounded-xl border border-zinc-800 flex items-center text-xs">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                viewMode === 'month' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Month Grid
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                viewMode === 'agenda' ? 'bg-zinc-800 text-white shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Full Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <span className="text-xs text-zinc-500 flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter:
        </span>
        {(['ALL', 'VARC', 'DILR', 'QUANTS', 'LECTURES', 'TASKS'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setFilterSection(filter)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition border ${
              filterSection === filter
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs shadow-indigo-500/20'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            {filter === 'ALL' ? 'All Activities' : filter}
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* 1. MONTH VIEW */}
      {/* ========================================================= */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Monthly Calendar Grid */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <span className="text-xs text-emerald-400 font-mono font-medium px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                  B-CAT2701 Term 1
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentMonth((prev) => (prev > 0 ? prev - 1 : 11))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentMonth((prev) => (prev < 11 ? prev + 1 : 0))}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Days of Week */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider py-1 border-b border-zinc-800/60">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((day, idx) => {
                const dayEvents = eventsByDate[day.dateStr] || { lectures: [], classTasks: [], personal: [] };
                const isSelected = selectedDate === day.dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day.dateStr)}
                    className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between transition cursor-pointer relative ${
                      !day.isCurrentMonth
                        ? 'opacity-25 border-transparent bg-zinc-950/30'
                        : isSelected
                        ? 'border-indigo-500 bg-indigo-950/20 shadow-xs shadow-indigo-500/10'
                        : day.isToday
                        ? 'border-indigo-500/50 bg-zinc-900/90'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-800/60'
                    }`}
                  >
                    {/* Date Header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold rounded-md w-5 h-5 flex items-center justify-center ${
                          day.isToday
                            ? 'bg-indigo-600 text-white font-bold'
                            : isSelected
                            ? 'text-indigo-400 font-bold'
                            : 'text-zinc-400'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                      {day.isToday && (
                        <span className="hidden sm:inline-block text-[9px] font-bold text-indigo-400 uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Event indicators / chips inside cell */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayEvents.lectures.slice(0, 2).map((lect) => (
                        <div
                          key={lect.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(day.dateStr);
                            setSelectedActivity(lect);
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate border flex items-center gap-1 transition hover:scale-102 ${getSectionBadgeStyle(
                            lect.section
                          )}`}
                        >
                          <span className="font-bold font-mono">{lect.subtopicCode}</span>
                          <span className="truncate hidden sm:inline">{lect.topic}</span>
                        </div>
                      ))}

                      {dayEvents.classTasks.slice(0, 1).map((t) => {
                        const isDone = !!taskProgress[t.id];
                        return (
                          <div
                            key={t.id}
                            className={`px-1.5 py-0.5 rounded text-[9px] truncate border flex items-center gap-1 ${
                              isDone
                                ? 'bg-zinc-900/80 border-zinc-800 text-zinc-500 line-through'
                                : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="truncate">{t.title}</span>
                          </div>
                        );
                      })}

                      {dayEvents.lectures.length + dayEvents.classTasks.length > 2 && (
                        <span className="text-[9px] text-zinc-500 block text-right font-mono">
                          +{dayEvents.lectures.length + dayEvents.classTasks.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Col: Selected Date Schedule & Tasks Drawer */}
          <div className="p-5 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Daily Plan
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h3>
              </div>
              {selectedDate === '2026-09-10' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  Today
                </span>
              )}
            </div>

            {/* Event list for selected date */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {/* Lectures */}
              {selectedDateEvents.lectures.length > 0 ? (
                selectedDateEvents.lectures.map((lect) => (
                  <div
                    key={lect.id}
                    className={`p-3.5 rounded-xl border space-y-2.5 transition ${getSectionBadgeStyle(
                      lect.section
                    )}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-black/40 border border-current">
                            {lect.subtopicCode}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-wider">
                            {lect.section}
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-white mt-1.5 leading-snug">{lect.topic}</h4>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-black/30 text-zinc-300 font-medium shrink-0">
                        {lect.mode}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 pt-1 border-t border-current/20">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {lect.timeRange}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {lect.mentor}
                      </span>
                    </div>

                    {lect.notes && (
                      <p className="text-xs text-zinc-300/90 leading-relaxed font-sans italic bg-black/20 p-2 rounded-lg">
                        {lect.notes}
                      </p>
                    )}

                    {/* Linked task quick launcher */}
                    {lect.linkedTaskIds && lect.linkedTaskIds.length > 0 && (
                      <div className="pt-2 border-t border-current/20">
                        <button
                          onClick={() => setActiveView('my-tasks')}
                          className="w-full py-1.5 px-3 rounded-lg bg-black/50 hover:bg-black/80 text-xs font-semibold text-white flex items-center justify-between transition"
                        >
                          <span>Open Assigned Class Tasks ({lect.linkedTaskIds.length})</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-center text-xs text-zinc-500">
                  No scheduled lectures on this date.
                </div>
              )}

              {/* Class Tasks Due */}
              {selectedDateEvents.classTasks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Class Tasks Due Today
                  </span>
                  {selectedDateEvents.classTasks.map((task) => {
                    const isDone = !!taskProgress[task.id];
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTaskForModal(task)}
                        className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start gap-2.5 transition hover:border-zinc-700 cursor-pointer group"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskCompletion(task.id);
                          }}
                          className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition shrink-0 ${
                            isDone
                              ? 'bg-emerald-500 border-emerald-500 text-black'
                              : 'border-zinc-600 hover:border-zinc-400'
                          }`}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
                              {task.section}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">{task.deadlineTime}</span>
                          </div>
                          <p
                            className={`text-xs font-semibold mt-1 truncate ${
                              isDone ? 'text-zinc-500 line-through' : 'text-zinc-200'
                            }`}
                          >
                            {task.title}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
                                deleteTask(task.id);
                              }
                            }}
                            className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition shrink-0 cursor-pointer"
                            title={`Delete "${task.title}"`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-rose-400" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Personal Tasks */}
              {selectedDateEvents.personal.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Personal Targets
                  </span>
                  {selectedDateEvents.personal.map((pt) => (
                    <div
                      key={pt.id}
                      className="p-2.5 rounded-xl bg-zinc-900/70 border border-zinc-800 flex items-center gap-2 text-xs"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="text-zinc-300 truncate">{pt.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. AGENDA / FULL TIMETABLE VIEW */}
      {/* ========================================================= */}
      {viewMode === 'agenda' && (
        <div className="p-6 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-bold text-white">September 2026 Canonical Session Timeline</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Batch B-CAT2701 official lecture milestones and CAT 2027 exam orientation.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {scheduleActivities.map((session, idx) => {
              const isPast = session.date < '2026-09-10';
              const isToday = session.date === '2026-09-10';
              const isNext = session.date === '2026-09-12';

              return (
                <div
                  key={session.id}
                  onClick={() => setSelectedActivity(session)}
                  className={`p-4 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:scale-[1.005] ${
                    isToday
                      ? 'bg-indigo-950/30 border-indigo-500/60 shadow-xs shadow-indigo-500/10'
                      : isNext
                      ? 'bg-zinc-900 border-zinc-700 hover:border-indigo-500/40'
                      : isPast
                      ? 'bg-zinc-950/60 border-zinc-800/60 opacity-70'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Session Number & Section Pill */}
                    <div className="flex flex-col items-center shrink-0 min-w-[55px]">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">Lec {idx + 1}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border mt-1 ${getSectionBadgeStyle(
                          session.section
                        )}`}
                      >
                        {session.subtopicCode}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{session.topic}</h4>
                        {isToday && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase">
                            Today
                          </span>
                        )}
                        {isNext && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500 text-black uppercase">
                            Next Lecture
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{session.notes}</p>
                    </div>
                  </div>

                  {/* Timing & Date */}
                  <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="font-semibold text-zinc-200 block">
                        {session.day}, {session.date}
                      </span>
                      <span className="text-zinc-500 text-[11px] block">{session.timeRange}</span>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        isPast
                          ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                          : 'bg-indigo-950/60 border-indigo-800/40 text-indigo-300'
                      }`}
                    >
                      {isPast ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d0d10] border border-zinc-700 rounded-2xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-800">
              <div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border uppercase ${getSectionBadgeStyle(
                    selectedActivity.section
                  )}`}
                >
                  {selectedActivity.subtopicCode} • {selectedActivity.section}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">{selectedActivity.topic}</h3>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-300">
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500">Date & Day:</span>
                <span className="font-bold text-white">{selectedActivity.day}, {selectedActivity.date}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500">Timings:</span>
                <span className="font-bold text-white">{selectedActivity.timeRange}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500">Curriculum Target:</span>
                <span className="font-bold text-white">CAT 2027</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                <span className="text-zinc-500">Delivery Mode:</span>
                <span className="font-bold text-white">{selectedActivity.mode} (Center)</span>
              </div>
            </div>

            {selectedActivity.notes && (
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Syllabus Guidance & Focus
                </span>
                <p>{selectedActivity.notes}</p>
              </div>
            )}

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => {
                  setSelectedActivity(null);
                  setActiveView('my-tasks');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl btn-primary-glass text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>View Linked Tasks</span>
              </button>
              <button
                onClick={() => setSelectedActivity(null)}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarged Task Modal */}
      {selectedTaskForModal && (
        <TaskDetailModal
          task={selectedTaskForModal}
          isOpen={true}
          onClose={() => setSelectedTaskForModal(null)}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
};
