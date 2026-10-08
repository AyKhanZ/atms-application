import { WorkItemRefModel } from '../work-items';
import { DictionaryModel } from '../dictionary.model';

export interface CommentReferenceModel {
  code: string;
  type: 'project' | 'ticket' | 'task';
  isSubtask: boolean;
  title: string;
  status: DictionaryModel;
  ref: WorkItemRefModel;
}
