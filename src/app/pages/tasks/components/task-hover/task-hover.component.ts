import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { WorkItemKind } from '../../../../core/models/work-items';
import { workTaskKind, workTaskParent } from '../../../../core/utils/work-task.utils';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { isOverdueTask } from '../../../../core/utils/deadline.utils';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { OverdueBadgeComponent } from '../../../../shared/components/overdue-badge/overdue-badge.component';
import { TaskStatusBadgeComponent } from '../../../projects/tasks/components/task-status-badge/task-status-badge.component';

/**
 * Everything a one-line calendar chip leaves out, on hover, drawn the way the rest of BAIM draws
 * it: the kind stripe, projects and parents with their icon and code, the state badge, the person
 * with their avatar. Shown with `pTooltip` and the `task-hover` style class.
 */
@Component({
  selector: 'app-task-hover',
  host: { '[class.is-subtask]': 'task().isSubtask' },
  imports: [
    DatePipe,
    WorkItemRefComponent,
    WorkItemPriorityComponent,
    WorkItemAssigneeComponent,
    OverdueBadgeComponent,
    TaskStatusBadgeComponent,
  ],
  templateUrl: './task-hover.component.html',
  styleUrl: './task-hover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskHoverComponent {
  readonly task = input.required<WorkTaskModel>();

  protected readonly projectKind = WorkItemKind.Project;
  protected readonly kind = computed(() => workTaskKind(this.task()));
  protected readonly parent = computed(() => workTaskParent(this.task()));
  protected readonly overdue = computed(() => isOverdueTask(this.task()));
}
