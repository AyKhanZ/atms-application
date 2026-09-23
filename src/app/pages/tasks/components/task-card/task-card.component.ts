import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { WorkItemKind } from '../../../../core/models/work-items';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';

/**
 * One task or subtask on the board. Says what it is ("SUBTASK #70" in its kind's colour), where it
 * lives — the parent task for a subtask, the ticket for a task, and the project when the page
 * spans several — and who, how urgent, by when.
 */
@Component({
  selector: 'app-task-card',
  imports: [
    DatePipe,
    MenuModule,
    WorkItemRefComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
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

  protected readonly kind = computed(() =>
    this.task().isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task,
  );

  /** Where it lives, one line: the parent task, or the ticket. */
  protected readonly location = computed(() => {
    const task = this.task();
    return task.isSubtask
      ? {
          icon: 'pi-check-square',
          text: `#${task.parentWorkTask?.code} ${task.parentWorkTask?.name}`,
        }
      : { icon: 'pi-ticket', text: `#${task.workTicket.code} ${task.workTicket.name}` };
  });

  protected readonly done = computed(() => this.task().status.id === WorkTaskStatus.Done);

  /** Past its deadline and not done: the one thing on a card that needs attention first. */
  protected readonly overdue = computed(() => {
    const task = this.task();
    if (!task.deadline || task.status.id === WorkTaskStatus.Done) return false;
    const end = new Date(task.deadline);
    end.setHours(23, 59, 59, 999);
    return end.getTime() < Date.now();
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
