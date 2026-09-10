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
  Clock,
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
    <header className="sticky top-0 z-30 bg-zinc-950/75 backdrop-blur-2xl border-b border-white/[0.08] text-zinc-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Menu Toggle + Logo & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition flex items-center justify-center cursor-pointer"
            aria-label="Toggle navigation"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-zinc-950 flex items-center justify-center font-bold text-base shadow-[0_0_18px_rgba(16,185,129,0.3)] ring-1 ring-white/20 transition group-hover:scale-105">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-sm tracking-tight group-hover:text-emerald-300 transition">
                  PrepDesk
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  CAT 2027
                </span>
              </div>
            </div>
          </div>

          <div className="hidden md:block h-4 w-[1px] bg-white/[0.1] mx-2" />
          <h1 className="hidden md:block text-xs font-medium text-zinc-400 truncate max-w-xs">
            {getPageTitle()}
          </h1>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick Schedule / Calendar Button */}
          <button
            onClick={() => setActiveView('calendar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'calendar' || activeView === 'schedule'
                ? 'bg-white/[0.1] text-white border border-white/[0.18] shadow-xs'
                : 'btn-glass text-zinc-300 hover:text-white'
            }`}
            title="Open Master Schedule & Calendar"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Timetable</span>
          </button>

          {/* Quick Community Feed Link */}
          <button
            onClick={() => setActiveView('feed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeView === 'feed'
                ? 'bg-white/[0.1] text-white border border-white/[0.18] shadow-xs'
                : 'btn-glass text-zinc-300 hover:text-white'
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
              className="relative p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-panel rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white tracking-tight">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Notifications List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06] my-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      No notifications yet. You're all caught up!
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`py-3 px-2 rounded-xl transition cursor-pointer flex items-start gap-3 ${
                          notif.read
                            ? 'hover:bg-white/[0.03] opacity-70'
                            : 'bg-white/[0.04] hover:bg-white/[0.07]'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                            notif.type === 'DEADLINE_APPROACHING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : notif.type === 'TASK_OVERDUE'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                            {notif.message}
                          </p>
                          <span className="text-[10px] text-zinc-500 font-mono mt-1 block">
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notif.id);
                          }}
                          className="text-zinc-600 hover:text-rose-400 p-1 rounded-lg transition"
                          title="Dismiss"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pl-2.5 rounded-xl btn-glass cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-bold">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-medium text-zinc-200 hidden md:inline max-w-[100px] truncate">
                {user?.displayName || 'Scholar'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {/* Profile Dropdown */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-white/[0.08]">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.displayName || 'PrepDesk Scholar'}
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono truncate">
                    {user?.studentId || user?.email}
                  </p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {isAdmin ? 'Faculty Administrator' : 'Batch B-CAT2701'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setActiveView('profile');
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl transition cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>My Profile</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setActiveView('admin-students');
                        setProfileOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Admin Management</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      signOut();
                      setProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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
