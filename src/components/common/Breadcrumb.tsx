import React from "react";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { ActiveView } from "../../types";
import { useAuth } from "../../context/AuthContext";

interface BreadcrumbProps {
  activeView: ActiveView;
  setActiveView: (v: ActiveView) => void;
}

const CRUMB_MAP: Record<string, { label: string; parent?: ActiveView; parentLabel?: string }> = {
  "dashboard":         { label: "Dashboard" },
  "calendar":          { label: "Timetable", parent: "dashboard", parentLabel: "Dashboard" },
  "schedule":          { label: "Timetable", parent: "dashboard", parentLabel: "Dashboard" },
  "feed":              { label: "Community Feed", parent: "dashboard", parentLabel: "Dashboard" },
  "varc-vocab":        { label: "Vocabulary Vault", parent: "dashboard", parentLabel: "Dashboard" },
  "varc-test":         { label: "Vocab Drill", parent: "varc-vocab", parentLabel: "Vocabulary Vault" },
  "varc-tasks":        { label: "VARC Assignments", parent: "dashboard", parentLabel: "Dashboard" },
  "dilr-tasks":        { label: "DILR Assignments", parent: "dashboard", parentLabel: "Dashboard" },
  "quant-tasks":       { label: "Quants Assignments", parent: "dashboard", parentLabel: "Dashboard" },
  "my-tasks":          { label: "My Tasks", parent: "dashboard", parentLabel: "Dashboard" },
  "profile":           { label: "My Profile", parent: "dashboard", parentLabel: "Dashboard" },
  "admin-create":      { label: "Publish Task", parent: "admin-manage", parentLabel: "Manage Tasks" },
  "admin-manage":      { label: "Manage Tasks", parent: "dashboard", parentLabel: "Dashboard" },
  "admin-users":       { label: "Student Roster", parent: "dashboard", parentLabel: "Dashboard" },
  "admin-students":    { label: "Student Roster", parent: "dashboard", parentLabel: "Dashboard" },
  "admin-stats":       { label: "Batch Analytics", parent: "dashboard", parentLabel: "Dashboard" },
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ activeView, setActiveView }) => {
  const { isAdmin } = useAuth();
  if (activeView === "dashboard" || (!isAdmin && activeView.startsWith("admin-"))) return null;

  const crumb = CRUMB_MAP[activeView] || { label: activeView };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-4 px-0.5 select-none">
      <button
        onClick={() => setActiveView("dashboard")}
        className="flex items-center gap-1 text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
      >
        <LayoutDashboard className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </button>

      {crumb.parent && crumb.parent !== "dashboard" && (
        <>
          <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
          <button
            onClick={() => setActiveView(crumb.parent!)}
            className="text-zinc-500 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            {crumb.parentLabel}
          </button>
        </>
      )}

      <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />
      <span className="text-zinc-200 font-medium">{crumb.label}</span>
    </nav>
  );
};
