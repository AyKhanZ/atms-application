import { DictionaryModel } from '../dictionary.model';
import { AttachmentAuthorModel } from './attachment-author.model';

export interface AttachmentModel {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
  createdBy: AttachmentAuthorModel;
  workTask: DictionaryModel<string>;
  parentWorkTask?: DictionaryModel<string> | null;
}
