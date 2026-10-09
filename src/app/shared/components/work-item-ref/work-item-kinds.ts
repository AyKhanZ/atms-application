import { WorkItemKind } from '../../../core/models/work-items';

export interface WorkItemKindView {
  icon: string;
  // "Task #34"
  label: string;
  // search heading, filter chip
  pluralLabel: string;
  // class name, the color is a token in styles.scss
  tone: string;
}

// colors avoid orange and green, statuses use them; all labels here so headings and rows cant drift
export const workItemKinds: Record<WorkItemKind, WorkItemKindView> = {
  [WorkItemKind.Project]: {
    icon: 'pi-briefcase',
    label: 'Project',
    pluralLabel: 'Projects',
    tone: 'project',
  },
  [WorkItemKind.Ticket]: {
    icon: 'pi-ticket',
    label: 'Ticket',
    pluralLabel: 'Tickets',
    tone: 'ticket',
  },
  [WorkItemKind.Task]: {
    icon: 'pi-check-square',
    label: 'Task',
    pluralLabel: 'Tasks',
    tone: 'task',
  },
  [WorkItemKind.Subtask]: {
    icon: 'pi-sitemap',
    label: 'Subtask',
    pluralLabel: 'Subtasks',
    tone: 'subtask',
  },
};

// outermost first
export const workItemKindOrder: readonly WorkItemKind[] = [
  WorkItemKind.Project,
  WorkItemKind.Ticket,
  WorkItemKind.Task,
  WorkItemKind.Subtask,
];

const kindLabelKeys: Record<WorkItemKind, { one: string; many: string }> = {
  [WorkItemKind.Project]: { one: 'workItem.kind.project', many: 'workItem.kind.projects' },
  [WorkItemKind.Ticket]: { one: 'workItem.kind.ticket', many: 'workItem.kind.tickets' },
  [WorkItemKind.Task]: { one: 'workItem.kind.task', many: 'workItem.kind.tasks' },
  [WorkItemKind.Subtask]: { one: 'workItem.kind.subtask', many: 'workItem.kind.subtasks' },
};

export function workItemKindLabelKey(kind: WorkItemKind, plural = false): string {
  const keys = kindLabelKeys[kind];
  return plural ? keys.many : keys.one;
}
