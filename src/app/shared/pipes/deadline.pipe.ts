import { Pipe, PipeTransform } from '@angular/core';

function startOfDay(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysFromToday(value: string | Date): number | null {
  const target = startOfDay(value);
  if (!Number.isFinite(target.getTime())) return null;
  return Math.round((target.getTime() - startOfDay(new Date()).getTime()) / 86_400_000);
}

/** "Today" / "in 5 days" / "overdue by 2 days" — the muted line under a deadline date. */
@Pipe({ name: 'deadlineLabel' })
export class DeadlineLabelPipe implements PipeTransform {
  transform(deadline?: string | Date | null): string {
    if (!deadline) return '';

    const days = daysFromToday(deadline);
    if (days === null) return '';
    if (days === 0) return 'Today';
    if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;

    const overdue = Math.abs(days);
    return `overdue by ${overdue} day${overdue === 1 ? '' : 's'}`;
  }
}

/** True once the deadline is in the past, so the date can be flagged. */
@Pipe({ name: 'isOverdue' })
export class IsOverduePipe implements PipeTransform {
  transform(deadline?: string | Date | null): boolean {
    if (!deadline) return false;
    const days = daysFromToday(deadline);
    return days !== null && days < 0;
  }
}
