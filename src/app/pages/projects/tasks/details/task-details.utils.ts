import { Params } from '@angular/router';
import { Confirmation } from 'primeng/api';
import { confirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { BreadcrumbItem } from '../../../../core/models/breadcrumb-item.model';
import { WorkProjectModel } from '../../../../core/models/work-projects/work-project.model';
import { WorkTaskModel } from '../../../../core/models/work-tasks';

export type TaskTab = 'details' | 'subtasks' | 'attachments' | 'history';

export function parseTaskTab(value: string | null): TaskTab {
  return value === 'subtasks' || value === 'attachments' || value === 'history' ? value : 'details';
}

export function taskTabQueryParam(tab: TaskTab): string | null {
  return tab === 'details' ? null : tab;
}

/**
 * The whole trail at once instead of renamed route segments: a subtask has no segment of its own
 * for the parent task, and without this crumb the trail jumps straight from the ticket to the
 * subtask.
 */
export function taskBreadcrumbTrail(
  project: Pick<WorkProjectModel, 'code' | 'title'>,
  task: WorkTaskModel,
): BreadcrumbItem[] {
  const ticketPath = `/projects/${task.workProjectId}/tickets/${task.workTicket.id}`;
  const items: BreadcrumbItem[] = [
    { title: 'Projects', path: '/projects', icon: 'pi-briefcase' },
    { title: `#${project.code} ${project.title}`, path: `/projects/${task.workProjectId}` },
    {
      title: `#${task.workTicket.code} ${task.workTicket.name}`,
      path: ticketPath,
      icon: 'pi-ticket',
    },
  ];

  if (task.parentWorkTask?.id) {
    items.push({
      title: `#${task.parentWorkTask?.code} ${task.parentWorkTask?.name}`,
      path: `${ticketPath}/tasks/${task.parentWorkTask?.id}`,
      icon: 'pi-check-square',
    });
  }

  items.push({
    title: `#${task.code} ${task.title}`,
    path: `${ticketPath}/tasks/${task.id}`,
    icon: task.isSubtask ? 'pi-sitemap' : 'pi-check-square',
  });

  return items;
}

/** Where a task sits: its parent task's Subtasks tab, or its ticket's Tasks tab. */
export function taskParentRoute(task: WorkTaskModel): { commands: string[]; queryParams: Params } {
  const ticket = ['/projects', task.workProjectId, 'tickets', task.workTicket.id];
  return task.parentWorkTask?.id
    ? { commands: [...ticket, 'tasks', task.parentWorkTask?.id], queryParams: { tab: 'subtasks' } }
    : { commands: ticket, queryParams: { tab: 'tasks' } };
}

/**
 * A task goes with its subtasks (05-tasks, «Удаление»): a subtask cannot live without its parent,
 * and deleting them one by one first was the chore this replaced. The dialog says what else goes,
 * so nothing disappears unannounced. Undo follows in the message after the delete.
 */
export function taskDeleteConfirmation(task: WorkTaskModel, accept: () => void): Confirmation {
  const kind = task.isSubtask ? 'subtask' : 'task';
  const subtasks = task.subtaskCount === 1 ? 'subtask' : 'subtasks';
  const what =
    task.subtaskCount > 0
      ? `It will be deleted together with its ${task.subtaskCount} ${subtasks}.`
      : `This ${kind} will be deleted.`;
  return {
    key: 'taskDelete',
    header: `Delete ${kind}?`,
    message: `#${task.code} ${task.title}
${what}`,
    acceptLabel: task.subtaskCount > 0 ? 'Delete task and subtasks' : 'Delete',
    rejectLabel: 'Cancel',
    acceptButtonProps: confirmTone('danger'),
    accept,
  };
}
