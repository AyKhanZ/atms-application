import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { workTaskKind } from '../../../../core/utils/work-task.utils';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';
import { OverdueBadgeComponent } from '../../../../shared/components/overdue-badge/overdue-badge.component';
import { daysFromToday, isOverdueTask } from '../../../../core/utils/deadline.utils';
import { TaskContextComponent } from '../task-context/task-context.component';

@Component({
  selector: 'app-task-card',
  imports: [
    MenuModule,
    WorkItemRefComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
    TaskContextComponent,
    OverdueBadgeComponent,
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCardComponent {
  readonly task = input.required<WorkTaskModel>();
  // the page mixes several projects
  readonly showProject = input(false);
  // off for people who cant edit
  readonly canMove = input(false);
  readonly open = output<void>();
  readonly moveTo = output<WorkTaskStatus>();
  readonly moveToTop = output<void>();

  protected readonly kind = computed(() => workTaskKind(this.task()));

  protected readonly done = computed(() => this.task().status.id === WorkTaskStatus.Done);

  protected readonly overdue = computed(() => isOverdueTask(this.task()));

  // further dates arent worth a place on the card
  protected readonly dueSoon = computed(() => {
    const { deadline } = this.task();
    if (!deadline || this.done()) return null;
    const days = daysFromToday(deadline);
    return days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : null;
  });

  protected readonly menu = computed<MenuItem[]>(() => {
    const status = this.task().status.id;
    const moves: MenuItem[] = this.canMove()
      ? [
          ...[
            { id: WorkTaskStatus.New, label: 'New' },
            { id: WorkTaskStatus.InProgress, label: 'In Progress' },
            { id: WorkTaskStatus.Done, label: 'Done' },
          ]
            .filter((target) => target.id !== status)
            .map((target) => ({
              label: `Move to ${target.label}`,
              icon: 'pi pi-arrow-right',
              command: () => this.moveTo.emit(target.id),
            })),
          ...(status === WorkTaskStatus.Done
            ? []
            : [
                {
                  label: 'Move to top',
                  icon: 'pi pi-arrow-up',
                  command: () => this.moveToTop.emit(),
                },
              ]),
          { separator: true },
        ]
      : [];
    return [
      ...moves,
      { label: 'Open', icon: 'pi pi-external-link', command: () => this.open.emit() },
    ];
  });
}
