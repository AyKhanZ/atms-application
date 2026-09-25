import { DictionaryModel } from '../models/dictionary.model';
import { WorkItemKind } from '../models/work-items';

/** Task or Subtask: the one fact the kind of a work task depends on. */
export function workTaskKind(task: {
  isSubtask: boolean;
}): WorkItemKind.Task | WorkItemKind.Subtask {
  return task.isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task;
}

/** Where a work task lives: a subtask under its task, a task under its ticket. */
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
