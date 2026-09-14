import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Search, LayoutDashboard, Calendar, BookOpen, HelpCircle,
  ListTodo, MessageSquare, User, PlusCircle, Settings2,
  Users, BarChart3, CheckSquare, X,
} from "lucide-react";
import { ActiveView } from "../../types";
import { useAuth } from "../../context/AuthContext";

interface Command {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
  view: ActiveView;
  group: string;
}

const BASE_COMMANDS: Command[] = [
  { id: "dashboard",   label: "Go to Dashboard",       shortcut: "G D", icon: <LayoutDashboard className="w-4 h-4" />, view: "dashboard",   group: "Navigate" },
  { id: "calendar",    label: "Open Timetable",         shortcut: "G T", icon: <Calendar className="w-4 h-4" />,       view: "calendar",    group: "Navigate" },
  { id: "my-tasks",    label: "My Task Tracker",        shortcut: "G M", icon: <CheckSquare className="w-4 h-4" />,    view: "my-tasks",    group: "Navigate" },
  { id: "feed",        label: "Community Feed",         shortcut: "G F", icon: <MessageSquare className="w-4 h-4" />,  view: "feed",        group: "Navigate" },
  { id: "varc-vocab",  label: "Vocabulary Vault",       shortcut: "G V", icon: <BookOpen className="w-4 h-4" />,       view: "varc-vocab",  group: "Navigate" },
  { id: "varc-test",   label: "Vocabulary Drill / Test",shortcut: "G E", icon: <HelpCircle className="w-4 h-4" />,    view: "varc-test",   group: "Navigate" },
  { id: "varc-tasks",  label: "VARC Assignments",       shortcut: "",    icon: <ListTodo className="w-4 h-4" />,       view: "varc-tasks",  group: "Subjects" },
  { id: "dilr-tasks",  label: "DILR Assignments",       shortcut: "",    icon: <ListTodo className="w-4 h-4" />,       view: "dilr-tasks",  group: "Subjects" },
  { id: "quant-tasks", label: "Quants Assignments",     shortcut: "",    icon: <ListTodo className="w-4 h-4" />,       view: "quant-tasks", group: "Subjects" },
  { id: "profile",     label: "My Profile",             shortcut: "G P", icon: <User className="w-4 h-4" />,          view: "profile",     group: "Account" },
];

const ADMIN_COMMANDS: Command[] = [
  { id: "admin-create",  label: "Publish New Task",    shortcut: "A N", icon: <PlusCircle className="w-4 h-4" />,  view: "admin-create",  group: "Admin" },
  { id: "admin-manage",  label: "Manage Tasks",        shortcut: "A M", icon: <Settings2 className="w-4 h-4" />,  view: "admin-manage",  group: "Admin" },
  { id: "admin-students",label: "Student Roster",      shortcut: "A S", icon: <Users className="w-4 h-4" />,      view: "admin-students",group: "Admin" },
  { id: "admin-stats",   label: "Batch Analytics",     shortcut: "A B", icon: <BarChart3 className="w-4 h-4" />,  view: "admin-stats",   group: "Admin" },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  setActiveView: (v: ActiveView) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, setActiveView }) => {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isAdmin } = useAuth();

  const allCommands = isAdmin ? [...BASE_COMMANDS, ...ADMIN_COMMANDS] : BASE_COMMANDS;

  const filtered = query.trim()
    ? allCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : allCommands;

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  // Flat list for keyboard nav
  const flat = Object.values(grouped).flat();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 60);
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  const execute = useCallback((cmd: Command) => {
    setActiveView(cmd.view);
    onClose();
  }, [setActiveView, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, flat.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === "Enter" && flat[selected]) { e.preventDefault(); execute(flat[selected]); }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, selected, execute, onClose]);

  // Reset selected when query changes
  useEffect(() => setSelected(0), [query]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      <div
        className="relative w-full max-w-xl glass-panel rounded-2xl shadow-2xl border border-white/[0.12] overflow-hidden animate-card-modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tasks, pages, settings..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-zinc-500 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-mono text-zinc-500 bg-white/[0.06] border border-white/[0.08] rounded-lg">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="text-center text-xs text-zinc-500 py-8">No results for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([group, cmds]) => (
              <div key={group} className="mb-2">
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {group}
                </div>
                {cmds.map((cmd) => {
                  const idx = flatIdx++;
                  const isActive = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer ${
                        isActive
                          ? "bg-indigo-500/15 text-white border border-indigo-500/25"
                          : "text-zinc-300 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={isActive ? "text-indigo-400" : "text-zinc-500"}>
                          {cmd.icon}
                        </span>
                        <span>{cmd.label}</span>
                      </div>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] font-mono text-zinc-500 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded-md">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center gap-3 text-[11px] text-zinc-600">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
          <span className="ml-auto font-mono">Cmd+K anywhere</span>
        </div>
      </div>
    </div>
  );
};
