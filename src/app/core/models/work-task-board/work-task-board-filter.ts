import { WorkItemKind } from '../work-items';

/** Deadline filter: anything, work without a deadline, or open work already past it. */
export type WorkTaskBoardDeadline = 'any' | 'none' | 'overdue';

/**
 * The Tasks page's filters. Every list means "any of", an empty one does not filter. People are
 * filtered by user, not by participant: one person, many projects.
 */
export interface WorkTaskBoardFilter {
  projectIds: string[];
  workTicketIds: string[];
  /** Task or Subtask; null for both. */
  kind: WorkItemKind.Task | WorkItemKind.Subtask | null;
  assigneeUserIds: string[];
  /** Include tasks nobody is assigned to. */
  unassigned: boolean;
  statusIds: number[];
  priorityIds: number[];
  deadline: WorkTaskBoardDeadline;
  search: string;
}

/** Narrowing a request adds to the filters the page shows, it does not replace them. */
export interface WorkTaskBoardQuery extends WorkTaskBoardFilter {
  deadlineFrom?: string | null;
  deadlineTo?: string | null;
  noDeadline?: boolean;
  /** One side of the overdue split: true only overdue work, false everything else. */
  overdue?: boolean;
}

export const emptyWorkTaskBoardFilter: WorkTaskBoardFilter = {
  projectIds: [],
  workTicketIds: [],
  kind: null,
  assigneeUserIds: [],
  unassigned: false,
  statusIds: [],
  priorityIds: [],
  deadline: 'any',
  search: '',
};
