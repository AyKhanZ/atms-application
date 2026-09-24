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

/** A project's plan levels that hold files, with counts; files are read per ticket. */
export interface AttachmentTreeModel {
  fileCount: number;
  groups: AttachmentTreeGroupModel[];
}
