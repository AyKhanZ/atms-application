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
  const ticketPath = `/projects/${task.workProjectId}/tickets/${task.workTicketId}`;
  const items: BreadcrumbItem[] = [
    { title: 'Projects', path: '/projects', icon: 'pi-briefcase' },
    { title: `#${project.code} ${project.title}`, path: `/projects/${task.workProjectId}` },
    {
      title: `#${task.workTicketCode} ${task.workTicketTitle}`,
      path: ticketPath,
      icon: 'pi-ticket',
    },
  ];

  if (task.parentWorkTaskId) {
    items.push({
      title: `#${task.parentWorkTaskCode} ${task.parentWorkTaskTitle}`,
      path: `${ticketPath}/tasks/${task.parentWorkTaskId}`,
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
  const ticket = ['/projects', task.workProjectId, 'tickets', task.workTicketId];
  return task.parentWorkTaskId
    ? { commands: [...ticket, 'tasks', task.parentWorkTaskId], queryParams: { tab: 'subtasks' } }
    : { commands: ticket, queryParams: { tab: 'tasks' } };
}

/** A task with subtasks is not deleted: they would be left without a parent. Says what to do. */
export function taskDeleteBlockedConfirmation(task: WorkTaskModel): Confirmation {
  const subtasks = task.subtaskCount === 1 ? 'subtask' : 'subtasks';
  return {
    key: 'taskDelete',
    header: "This task can't be deleted yet",
    message: `#${task.code} ${task.title}
It still has ${task.subtaskCount} ${subtasks}. Delete them first, then delete the task.`,
    acceptLabel: 'Got it',
    rejectVisible: false,
    acceptButtonProps: confirmTone('warning'),
  };
}

export function taskDeleteConfirmation(task: WorkTaskModel, accept: () => void): Confirmation {
  const kind = task.isSubtask ? 'subtask' : 'task';
  return {
    key: 'taskDelete',
    header: `Delete ${kind}?`,
    message: `#${task.code} ${task.title}
This ${kind} will be deleted. This action cannot be undone.`,
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    acceptButtonProps: confirmTone('danger'),
    accept,
  };
}
