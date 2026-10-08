import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import { isOverdueTask } from '../../../../core/utils/deadline.utils';
import { workTaskKind } from '../../../../core/utils/work-task.utils';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { OverdueBadgeComponent } from '../../../../shared/components/overdue-badge/overdue-badge.component';
import { PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import { TaskHoverComponent } from '../task-hover/task-hover.component';

// one line on the month grid, two in the phone agenda, the rest is in the hover card
@Component({
  selector: 'app-task-calendar-chip',
  imports: [
    TooltipModule,
    WorkItemRefComponent,
    WorkItemAssigneeComponent,
    OverdueBadgeComponent,
    TaskHoverComponent,
    PersonNamePipe,
  ],
  templateUrl: './task-calendar-chip.component.html',
  styleUrl: './task-calendar-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCalendarChipComponent {
  readonly task = input.required<WorkTaskModel>();
  readonly phone = input(false);
  // every task on the page is the viewers own, an avatar on each says nothing
  readonly hideAssignee = input(false);
  readonly open = output<void>();

  protected readonly kind = computed(() => workTaskKind(this.task()));
  protected readonly done = computed(() => this.task().status.id === WorkTaskStatus.Done);
  protected readonly overdue = computed(() => isOverdueTask(this.task()));
  protected readonly label = computed(() => {
    const task = this.task();
    return `${task.isSubtask ? 'Subtask' : 'Task'} #${task.code}: ${task.title}, ${task.status.name}`;
  });
}
