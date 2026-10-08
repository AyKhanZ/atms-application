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
