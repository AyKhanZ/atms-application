import { DictionaryModel } from '../dictionary.model';

export interface AttachmentTreeTicketModel {
  workTicket: DictionaryModel<string>;
  fileCount: number;
}

export interface AttachmentTreeMilestoneModel {
  id: string;
  title: string;
  fileCount: number;
  tickets: AttachmentTreeTicketModel[];
}

export interface AttachmentTreeGroupModel {
  id: string;
  title: string;
  fileCount: number;
  milestones: AttachmentTreeMilestoneModel[];
}

// only levels with file counts, files are loaded per ticket
export interface AttachmentTreeModel {
  fileCount: number;
  groups: AttachmentTreeGroupModel[];
}
