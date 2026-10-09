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

export type LateUnit = 'day' | 'week' | 'month' | 'year';

// days up to two weeks, then weeks, months, years; the words come from workItem.late.*
export function lateSpan(days: number): { count: number; unit: LateUnit } {
  if (days < 14) return { count: days, unit: 'day' };
  if (days < 60) return { count: Math.floor(days / 7), unit: 'week' };
  if (days < 365) return { count: Math.floor(days / 30), unit: 'month' };
  return { count: Math.floor(days / 365), unit: 'year' };
}

// done work is never overdue
export function isOverdueTask(
  task: { deadline?: string | null; status: { id: number } },
  now = new Date(),
): boolean {
  return task.status.id !== WorkTaskStatus.Done && daysLate(task.deadline, now) > 0;
}
