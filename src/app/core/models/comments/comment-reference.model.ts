import { WorkItemRefModel } from '../work-items';
import { DictionaryModel } from '../dictionary.model';

/** A `#41` in the text that the reader can open — a project, ticket or task: its current title and status. */
export interface CommentReferenceModel {
  code: string;
  type: 'project' | 'ticket' | 'task';
  isSubtask: boolean;
  title: string;
  status: DictionaryModel;
  ref: WorkItemRefModel;
}
