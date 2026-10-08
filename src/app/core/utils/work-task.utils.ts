import { DictionaryModel } from '../models/dictionary.model';
import { WorkItemKind } from '../models/work-items';

export function workTaskKind(task: {
  isSubtask: boolean;
}): WorkItemKind.Task | WorkItemKind.Subtask {
  return task.isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task;
}

export interface WorkTaskParent extends DictionaryModel<string> {
  kind: WorkItemKind.Task | WorkItemKind.Ticket;
}

export function workTaskParent(task: {
  isSubtask: boolean;
  workTicket: DictionaryModel<string>;
  parentWorkTask?: DictionaryModel<string> | null;
}): WorkTaskParent {
  return task.isSubtask && task.parentWorkTask
    ? { ...task.parentWorkTask, kind: WorkItemKind.Task }
    : { ...task.workTicket, kind: WorkItemKind.Ticket };
}
