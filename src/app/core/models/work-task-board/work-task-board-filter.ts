import { WorkItemKind } from '../work-items';

export type WorkTaskBoardDeadline = 'any' | 'none' | 'overdue';

// empty list = no filter; people by user id, not participant
export interface WorkTaskBoardFilter {
  projectIds: string[];
  workTicketIds: string[];
  // null = both
  kind: WorkItemKind.Task | WorkItemKind.Subtask | null;
  assigneeUserIds: string[];
  unassigned: boolean;
  statusIds: number[];
  priorityIds: number[];
  deadline: WorkTaskBoardDeadline;
  // from inclusive, to exclusive
  deadlineFrom: string | null;
  deadlineTo: string | null;
  search: string;
}

// adds to the filters on the page, doesnt replace them
export interface WorkTaskBoardQuery extends WorkTaskBoardFilter {
  noDeadline?: boolean;
  // true = only overdue, false = everything else
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
  deadlineFrom: null,
  deadlineTo: null,
  search: '',
};
