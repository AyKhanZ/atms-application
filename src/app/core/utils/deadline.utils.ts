import { WorkTaskStatus } from '../enums/work-task-status.enum';

const dayMs = 86_400_000;

// deadline is stored as the users local midnight
export function startOfDay(value: string | Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfToday(now = new Date()): Date {
  return startOfDay(now);
}

// latest a "created until" filter can reach
export function endOfToday(now = new Date()): Date {
  const date = new Date(now);
  date.setHours(23, 59, 59, 999);
  return date;
}

// 0 today, negative when passed, null if unreadable
export function daysFromToday(deadline: string | Date, now = new Date()): number | null {
  const target = startOfDay(deadline);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.round((target.getTime() - startOfToday(now).getTime()) / dayMs);
}

// 0 if none or not passed yet
export function daysLate(deadline: string | Date | null | undefined, now = new Date()): number {
  if (!deadline) return 0;
  const days = daysFromToday(deadline, now);
  return days !== null && days < 0 ? -days : 0;
}

// "8d" up to two weeks, then "3w", "2mo", "1yr" (m alone reads as minutes)
export function lateLabel(days: number): string {
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}yr`;
}

// done work is never overdue
export function isOverdueTask(
  task: { deadline?: string | null; status: { id: number } },
  now = new Date(),
): boolean {
  return task.status.id !== WorkTaskStatus.Done && daysLate(task.deadline, now) > 0;
}
