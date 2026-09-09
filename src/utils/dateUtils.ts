/**
 * Date and deadline calculation utilities for PrepDesk
 */

export interface DeadlineInfo {
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  daysRemaining: number;
  formattedDate: string;
  formattedTime: string;
  badgeText: string;
  badgeVariant: 'urgent' | 'warning' | 'info' | 'neutral' | 'overdue' | 'success';
}

export function parseTaskDeadline(deadlineDate: string, deadlineTime: string = '23:59'): Date {
  if (!deadlineDate) return new Date();
  const [year, month, day] = deadlineDate.split('-').map(Number);
  const [hours, minutes] = (deadlineTime || '23:59').split(':').map(Number);
  return new Date(year, month - 1, day, hours || 23, minutes || 59, 59);
}

export function getDeadlineInfo(
  deadlineDate: string,
  deadlineTime: string = '23:59',
  isCompleted: boolean = false
): DeadlineInfo {
  if (isCompleted) {
    return {
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      daysRemaining: 0,
      formattedDate: formatDatePretty(deadlineDate),
      formattedTime: formatTime12h(deadlineTime),
      badgeText: 'Completed',
      badgeVariant: 'success',
    };
  }

  const now = new Date();
  const deadline = parseTaskDeadline(deadlineDate, deadlineTime);
  const diffMs = deadline.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const todayStr = getTodayDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = formatDateToYYYYMMDD(tomorrowDate);

  const isDueToday = deadlineDate === todayStr;
  const isDueTomorrow = deadlineDate === tomorrowStr;
  const isOverdue = diffMs < 0;

  let badgeText = '';
  let badgeVariant: 'urgent' | 'warning' | 'info' | 'neutral' | 'overdue' | 'success' = 'neutral';

  if (isOverdue) {
    const overdueDays = Math.abs(Math.floor(diffDays));
    badgeText = overdueDays <= 1 ? 'Overdue today' : `Overdue by ${overdueDays} days`;
    badgeVariant = 'overdue';
  } else if (isDueToday) {
    badgeText = `Due Today, ${formatTime12h(deadlineTime)}`;
    badgeVariant = 'urgent';
  } else if (isDueTomorrow) {
    badgeText = `Due Tomorrow, ${formatTime12h(deadlineTime)}`;
    badgeVariant = 'warning';
  } else if (diffDays <= 3) {
    badgeText = `Due in ${diffDays} days`;
    badgeVariant = 'warning';
  } else {
    badgeText = `Due in ${diffDays} days`;
    badgeVariant = 'neutral';
  }

  return {
    isOverdue,
    isDueToday,
    isDueTomorrow,
    daysRemaining: diffDays,
    formattedDate: formatDatePretty(deadlineDate),
    formattedTime: formatTime12h(deadlineTime),
    badgeText,
    badgeVariant,
  };
}

export function formatTime12h(time24: string = '23:59'): string {
  if (!time24) return '11:59 PM';
  const [hoursStr, minsStr] = time24.split(':');
  let hours = parseInt(hoursStr, 10);
  const mins = minsStr || '00';
  if (isNaN(hours)) return time24;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  return `${hours}:${mins.padStart(2, '0')} ${ampm}`;
}

export function formatDatePretty(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getTodayDateString(): string {
  return formatDateToYYYYMMDD(new Date());
}

export function formatDateToYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface DueSoonInfo {
  isDueWithin24Hours: boolean;
  isOverdue: boolean;
  diffHours: number;
  diffMinutes: number;
  formattedCountdown: string;
  urgencyLevel: 'critical' | 'urgent' | 'warning' | 'normal';
}

export function getDueSoonInfo(
  deadlineDate: string,
  deadlineTime: string = '23:59',
  isCompleted: boolean = false
): DueSoonInfo {
  if (isCompleted || !deadlineDate) {
    return {
      isDueWithin24Hours: false,
      isOverdue: false,
      diffHours: 0,
      diffMinutes: 0,
      formattedCountdown: 'Completed',
      urgencyLevel: 'normal',
    };
  }

  const now = new Date();
  const deadline = parseTaskDeadline(deadlineDate, deadlineTime);
  const diffMs = deadline.getTime() - now.getTime();
  const isOverdue = diffMs < 0;

  if (isOverdue) {
    const overdueMinutes = Math.abs(Math.floor(diffMs / (1000 * 60)));
    const hours = Math.floor(overdueMinutes / 60);
    const mins = overdueMinutes % 60;
    const formatted = hours > 0 ? `Overdue by ${hours}h ${mins}m` : `Overdue by ${mins}m`;
    return {
      isDueWithin24Hours: false,
      isOverdue: true,
      diffHours: -hours,
      diffMinutes: -mins,
      formattedCountdown: formatted,
      urgencyLevel: 'critical',
    };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = diffMs / (1000 * 60 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const isDueWithin24Hours = diffHours <= 24;

  let urgencyLevel: 'critical' | 'urgent' | 'warning' | 'normal' = 'normal';
  let formattedCountdown = '';

  if (hours < 3) {
    urgencyLevel = 'critical';
    formattedCountdown = hours === 0 ? `Due in ${minutes} mins!` : `Due in ${hours}h ${minutes}m!`;
  } else if (hours < 12) {
    urgencyLevel = 'urgent';
    formattedCountdown = `Due in ${hours} hours`;
  } else if (isDueWithin24Hours) {
    urgencyLevel = 'warning';
    formattedCountdown = `Due in ${hours} hours`;
  } else {
    urgencyLevel = 'normal';
    formattedCountdown = `Due in ${Math.ceil(diffHours / 24)} days`;
  }

  return {
    isDueWithin24Hours,
    isOverdue: false,
    diffHours: hours,
    diffMinutes: minutes,
    formattedCountdown,
    urgencyLevel,
  };
}

