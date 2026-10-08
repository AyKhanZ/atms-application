import { Pipe, PipeTransform } from '@angular/core';
import { daysFromToday, daysLate } from '../../core/utils/deadline.utils';

// "Today" / "in 5 days" / "overdue by 2 days"
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

// closed work is never overdue
@Pipe({ name: 'isOverdue' })
export class IsOverduePipe implements PipeTransform {
  transform(deadline?: string | Date | null, closed = false): boolean {
    return !closed && daysLate(deadline) > 0;
  }
}
