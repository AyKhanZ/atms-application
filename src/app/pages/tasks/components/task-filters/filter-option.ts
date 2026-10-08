import { WorkItemKind } from '../../../../core/models/work-items';
import { WorkTaskBoardAssigneeModel } from '../../../../core/models/work-task-board';

export interface FilterOption<T = string> {
  value: T;
  // searched by the dropdown and shown in the summary
  label: string;
  ref?: { kind: WorkItemKind; code: number | string; title: string };
  // separates the special entries from the people
  divider?: boolean;
  person?: WorkTaskBoardAssigneeModel;
}

// same width however the search narrows the options, never wider than a phone
export const filterPanelStyle = { width: 'min(24rem, calc(100vw - 2rem))' };
