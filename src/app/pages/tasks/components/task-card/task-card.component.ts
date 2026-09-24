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

/**
 * One task or subtask on the board. Says what it is ("SUBTASK #70" in its kind's colour), where it
 * lives — the parent task for a subtask, the ticket for a task, and the project when the page
 * spans several — and who, how urgent, by when.
 */
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
  /** Put the project in front of the location: the page mixes several. */
  readonly showProject = input(false);
  /** Offer Move to in the menu; off for people who cannot edit. */
  readonly canMove = input(false);
  readonly open = output<void>();
  readonly moveTo = output<WorkTaskStatus>();
  readonly moveToTop = output<void>();

  protected readonly kind = computed(() => workTaskKind(this.task()));

  protected readonly done = computed(() => this.task().status.id === WorkTaskStatus.Done);

  /** Past its deadline and not done: the one thing on a card that needs attention first. */
  protected readonly overdue = computed(() => isOverdueTask(this.task()));

  /** "Due today" / "Due tomorrow" for open work; further dates are not worth a place on the card. */
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
