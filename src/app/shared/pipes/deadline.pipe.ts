import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { daysFromToday, daysLate } from '../../core/utils/deadline.utils';

// "Today" / "in 5 days" / "overdue by 2 days"
@Pipe({ name: 'deadlineLabel' })
export class DeadlineLabelPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(deadline?: string | Date | null): string {
    if (!deadline) return '';

    const days = daysFromToday(deadline);
    if (days === null) return '';
    if (days === 0) return this.transloco.translate('common.today');
    if (days > 0) return this.transloco.translate('workItem.inDays', { count: days });

    return this.transloco.translate('workItem.overdueBy', { count: Math.abs(days) });
  }
}

// closed work is never overdue
@Pipe({ name: 'isOverdue' })
export class IsOverduePipe implements PipeTransform {
  transform(deadline?: string | Date | null, closed = false): boolean {
    return !closed && daysLate(deadline) > 0;
  }
}
