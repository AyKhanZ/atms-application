import { WorkItemJumpComponent } from '../../../../../shared/components/work-item-jump/work-item-jump.component';
import { WorkItemJumpState } from '../../../../../shared/components/work-item-jump/work-item-jump-state';
import { WorkItemJumpContext } from '../../../../../shared/components/work-item-jump/work-item-jump-context';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';

@Component({
  selector: 'app-task-location',
  imports: [WorkItemJumpComponent],
  templateUrl: './task-location.component.html',
  styleUrl: './task-location.component.scss',
  providers: [WorkItemJumpState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskLocationComponent {
  readonly task = input.required<WorkTaskModel>();
  readonly allowJump = input(true);

  /**
   * The tree above the switcher, repeated inside the panel. A subtask carries one more level
   * than a task, because its siblings live under the parent task rather than under the ticket.
   */
  readonly jumpContext = computed<WorkItemJumpContext[]>(() => {
    const item = this.task();
    const chain: WorkItemJumpContext[] = [
      { icon: 'pi-folder', title: item.groupTitle },
      { icon: 'pi-flag', title: item.milestoneTitle },
      { icon: 'pi-ticket', title: `#${item.workTicketCode} ${item.workTicketTitle}` },
    ];

    if (item.parentWorkTaskId) {
      chain.push({
        icon: 'pi-check-square',
        title: `#${item.parentWorkTaskCode} ${item.parentWorkTaskTitle}`,
      });
    }

    return chain;
  });
  readonly jump = inject(WorkItemJumpState);
  private readonly api = inject(WorkTasksService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const item = this.task();
      const enabled = this.allowJump();
      if (!enabled) return;
      untracked(() =>
        this.jump.configure((search, cursor) =>
          this.api.getWorkTasks(item.workProjectId, {
            ...(item.parentWorkTaskId
              ? { parentWorkTaskId: item.parentWorkTaskId }
              : { workTicketId: item.workTicketId, rootTasksOnly: true }),
            pageSize: 50,
            search,
            cursor,
          }),
        ),
      );
    });
  }

  selectSibling(id: string): void {
    const item = this.task();
    void this.router.navigate([
      '/projects',
      item.workProjectId,
      'tickets',
      item.workTicketId,
      'tasks',
      id,
    ]);
  }
}
