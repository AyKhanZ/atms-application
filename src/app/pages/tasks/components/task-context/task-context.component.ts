import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkItemKind } from '../../../../core/models/work-items';
import { workTaskParent } from '../../../../core/utils/work-task.utils';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';

@Component({
  selector: 'app-task-context',
  imports: [RouterLink, WorkItemRefComponent],
  templateUrl: './task-context.component.html',
  styleUrl: './task-context.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskContextComponent {
  readonly task = input.required<WorkTaskModel>();
  /** A Project line above the parent, when the page mixes several projects. */
  readonly showProject = input(false);
  protected readonly taskKind = WorkItemKind.Task;
  protected readonly projectKind = WorkItemKind.Project;
  protected readonly project = computed(() => {
    const project = this.task().workProject;
    return project ? { ...project, url: ['/projects', project.id] } : null;
  });
  protected readonly parent = computed(() => {
    const task = this.task();
    const parent = workTaskParent(task);
    const ticketUrl = ['/projects', task.workProjectId, 'tickets', task.workTicket.id];
    return {
      ...parent,
      url: parent.kind === WorkItemKind.Task ? [...ticketUrl, 'tasks', parent.id] : ticketUrl,
    };
  });
}
