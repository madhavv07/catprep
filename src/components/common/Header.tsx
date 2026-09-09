import React, { useState } from 'react';
import {
  BookOpen,
  User,
  Shield,
  LogOut,
  ChevronDown,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Menu,
  MessageSquare,
  Calendar,
  Award,
  Check,
  Trash2,
  X,
  ExternalLink,
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { useNotifications } from '../../context/NotificationContext';
import { ActiveView } from '../../types';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeView, setActiveView, onToggleSidebar }) => {
  const { user, signOut, isAdmin } = useAuth();
  const { stats } = useTasks();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // View title helper
  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Study Dashboard';
      case 'calendar':
      case 'schedule':
        return 'CAT Master Timetable';
      case 'feed':
        return 'Student Community & Inquiries';
      case 'varc-vocab':
        return 'VARC Vocabulary Vault';
      case 'varc-test':
        return 'VARC Assessment Engine';
      case 'varc-tasks':
        return 'VARC Class Assignments';
      case 'dilr-tasks':
        return 'DILR Class Assignments';
      case 'quant-tasks':
        return 'Quants Class Assignments';
      case 'my-tasks':
        return 'My Task Tracker';
      case 'profile':
        return 'Student Profile';
      case 'admin-create':
        return 'Admin — Publish Class Task';
      case 'admin-manage':
        return 'Admin — Manage Tasks';
      case 'admin-users':
      case 'admin-students':
        return 'Admin — Student Roster & Enrollment';
      case 'admin-stats':
        return 'Admin — Batch Performance Analytics';
      default:
        return 'PrepDesk';
    }
  };

  const handleNotificationClick = (notif: any) => {
    markAsRead(notif.id);
    setNotificationsOpen(false);

    if (notif.entityType === 'task') {
      setActiveView('my-tasks');
    } else if (notif.entityType === 'test') {
      setActiveView('tests');
    } else if (notif.entityType === 'schedule') {
      setActiveView('calendar');
    } else if (notif.entityType === 'vocab') {
      setActiveView('varc-vocab');
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Menu Toggle + Logo & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition flex items-center justify-center"
            aria-label="Toggle navigation"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold text-lg shadow-xs transition group-hover:scale-105">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight group-hover:text-emerald-400 transition">
                  PrepDesk
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  CAT 2027
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block h-5 w-[1px] bg-zinc-800 mx-2" />
          <h1 className="hidden md:block text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate max-w-xs">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Schedule / Calendar Button */}
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
              activeView === 'calendar' || activeView === 'schedule'
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Open Master Schedule & Calendar"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Timetable</span>
          </button>



          {/* Quick Community Feed Link */}
          <button
            onClick={() => setActiveView('feed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
              activeView === 'feed'
                ? 'bg-emerald-500 text-black border-emerald-500 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800 hover:border-zinc-700'
            }`}
            title="Community Inquiries Feed"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Feed</span>
          </button>

          {/* Real-Time Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-850 border border-transparent hover:border-zinc-800 transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="mt-2.5 space-y-2 max-h-80 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500 space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                      <p>You're all caught up!</p>
                      <p className="text-[11px] text-zinc-600">No pending notifications.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 rounded-xl border text-xs transition cursor-pointer flex items-start gap-2.5 ${
                          !notif.read
                            ? 'bg-zinc-900 border-zinc-700 hover:border-emerald-500/50 shadow-xs'
                            : 'bg-zinc-950/60 border-zinc-850 opacity-70 hover:opacity-100 hover:border-zinc-750'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'TASK_OVERDUE' ? (
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                          ) : notif.type === 'TEST_RESULT' ? (
                            <Award className="w-4 h-4 text-emerald-400" />
                          ) : notif.type === 'DEADLINE_APPROACHING' ? (
                            <Clock className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-emerald-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="font-bold text-white truncate">{notif.title}</h4>
                            <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="text-zinc-500 hover:text-rose-400 p-1 rounded transition"
                          title="Delete notification"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-zinc-850 transition border border-transparent hover:border-zinc-800"
            >
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 text-emerald-400 flex items-center justify-center text-xs font-bold font-mono shadow-xs shrink-0">
                {user?.displayName?.charAt(0).toUpperCase() || user?.studentId?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white truncate max-w-[120px]">
                  {user?.displayName || 'Student'}
                </p>
                <p className="text-[10px] text-emerald-400 font-mono">
                  {user?.studentId || (isAdmin ? 'ADMIN' : 'STUDENT')}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#09090b] rounded-2xl shadow-2xl border border-zinc-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                <div className="px-4 py-2.5 border-b border-zinc-800">
                  <p className="font-bold text-white truncate">{user?.displayName}</p>
                  <p className="text-[11px] font-mono text-zinc-400 truncate">{user?.studentId}</p>
                  <span className="mt-1.5 inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                    {user?.role === 'admin' ? 'ADMINISTRATOR' : 'SCHOLAR (B-CAT2701)'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-300 hover:bg-zinc-850 hover:text-white flex items-center gap-2 transition"
                  >
                    <User className="w-4 h-4 text-zinc-500" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveView('my-tasks');
                      setProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-zinc-300 hover:bg-zinc-850 hover:text-white flex items-center gap-2 transition"
                  >
                    <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                    <span>My Tasks & Targets</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      signOut();
                      setProfileOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
