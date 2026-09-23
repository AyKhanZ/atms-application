import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { isOverdueTask } from '../../../../core/utils/deadline.utils';
import { workTaskKind } from '../../../../core/utils/work-task.utils';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';
import { OverdueBadgeComponent } from '../../../../shared/components/overdue-badge/overdue-badge.component';
import { TaskStatusBadgeComponent } from '../../../projects/tasks/components/task-status-badge/task-status-badge.component';

/**
 * One task of the list on a phone, where six columns do not fit: two lines, as in a ticket's Tasks
 * tab — the code and the whole title on top, status, priority, deadline and person below.
 */
@Component({
  selector: 'app-task-list-row',
  imports: [
    DatePipe,
    WorkItemRefComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
    OverdueBadgeComponent,
    TaskStatusBadgeComponent,
  ],
  templateUrl: './task-list-row.component.html',
  styleUrl: './task-list-row.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListRowComponent {
  readonly task = input.required<WorkTaskModel>();
  readonly open = output<void>();

  protected readonly kind = computed(() => workTaskKind(this.task()));
  protected readonly overdue = computed(() => isOverdueTask(this.task()));
}
