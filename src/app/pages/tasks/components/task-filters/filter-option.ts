import { WorkItemKind } from '../../../../core/models/work-items';
import { WorkTaskBoardAssigneeModel } from '../../../../core/models/work-task-board';

/** One entry of a Tasks page filter dropdown. */
export interface FilterOption<T = string> {
  value: T;
  /** What the dropdown searches and what a summary of the choice shows. */
  label: string;
  /** Drawn as the kind's icon and code in front of the title, as in details and search. */
  ref?: { kind: WorkItemKind; code: number | string; title: string };
  /** A line above this option, separating the special entries from the people. */
  divider?: boolean;
  person?: WorkTaskBoardAssigneeModel;
}

/** The same width however much the search has narrowed the options; never wider than a phone. */
export const filterPanelStyle = { width: 'min(24rem, calc(100vw - 2rem))' };
