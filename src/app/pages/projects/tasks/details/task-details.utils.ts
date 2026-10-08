import { Params } from '@angular/router';
import { Confirmation } from 'primeng/api';
import { confirmTone } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { BreadcrumbItem } from '../../../../core/models/breadcrumb-item.model';
import { WorkProjectModel } from '../../../../core/models/work-projects/work-project.model';
import { WorkTaskModel } from '../../../../core/models/work-tasks';

export type TaskTab = 'details' | 'subtasks' | 'attachments' | 'history';

const taskTabs: readonly TaskTab[] = ['details', 'subtasks', 'attachments', 'history'];

export function parseTaskTab(value: string | null): TaskTab {
  return taskTabs.find((tab) => tab === value) ?? 'details';
}

export function taskTabQueryParam(tab: TaskTab): string | null {
  return tab === 'details' ? null : tab;
}

// subtask route has no segment for the parent task, without this the trail jumps from ticket to subtask
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

export function taskParentRoute(task: WorkTaskModel): { commands: string[]; queryParams: Params } {
  const ticket = ['/projects', task.workProjectId, 'tickets', task.workTicket.id];
  return task.parentWorkTask?.id
    ? { commands: [...ticket, 'tasks', task.parentWorkTask?.id], queryParams: { tab: 'subtasks' } }
    : { commands: ticket, queryParams: { tab: 'tasks' } };
}

// deletes subtasks too, the dialog says what else goes
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
