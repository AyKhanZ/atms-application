import { WorkTaskStatus } from '../enums/work-task-status.enum';

const dayMs = 86_400_000;

/** Local midnight of the given moment. A deadline is stored as the user's local midnight. */
export function startOfDay(value: string | Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function startOfToday(now = new Date()): Date {
  return startOfDay(now);
}

/** The last moment of today: the latest a "created until" filter may reach. */
export function endOfToday(now = new Date()): Date {
  const date = new Date(now);
  date.setHours(23, 59, 59, 999);
  return date;
}

/** Whole days from today to the deadline: 0 today, negative once it has passed, null if unreadable. */
export function daysFromToday(deadline: string | Date, now = new Date()): number | null {
  const target = startOfDay(deadline);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.round((target.getTime() - startOfToday(now).getTime()) / dayMs);
}

/** How many days the deadline is behind: 0 when there is none or it has not passed yet. */
export function daysLate(deadline: string | Date | null | undefined, now = new Date()): number {
  if (!deadline) return 0;
  const days = daysFromToday(deadline, now);
  return days !== null && days < 0 ? -days : 0;
}

/**
 * How late, in the unit a person would say it: "8d" up to two weeks, then "3w", "2mo", "1yr" —
 * the short forms LinkedIn uses; "m" alone would read as minutes.
 * "85 days" makes the reader do the division.
 */
export function lateLabel(days: number): string {
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}yr`;
}

/** Open work past its deadline. Done work is never overdue, whatever its date. */
export function isOverdueTask(
  task: { deadline?: string | null; status: { id: number } },
  now = new Date(),
): boolean {
  return task.status.id !== WorkTaskStatus.Done && daysLate(task.deadline, now) > 0;
}
