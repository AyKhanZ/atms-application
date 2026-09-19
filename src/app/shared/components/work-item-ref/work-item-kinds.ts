import { WorkItemKind } from '../../../core/models/work-items';

export interface WorkItemKindView {
  icon: string;
  /** One item: "Task #34". */
  label: string;
  /** A group of them: a search heading, a filter chip. */
  pluralLabel: string;
  /** A class name, not a colour: the colour itself is a token in styles.scss. */
  tone: string;
}

/**
 * How each kind of work is told apart at a glance: the icon the lists and breadcrumbs already use,
 * plus a colour of its own. The colours stay off orange-as-a-pill and green, which the statuses use.
 * Every label for a kind lives here, so a heading and a row cannot drift apart.
 */
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

/** Outermost first — the order search groups and filter chips are drawn in. */
export const workItemKindOrder: readonly WorkItemKind[] = [
  WorkItemKind.Project,
  WorkItemKind.Ticket,
  WorkItemKind.Task,
  WorkItemKind.Subtask,
];
