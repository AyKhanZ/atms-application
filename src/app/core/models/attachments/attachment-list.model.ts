import { AttachmentModel } from './attachment.model';

export interface AttachmentListModel {
  items: AttachmentModel[];
  // server stops at 1000 files
  hasMore: boolean;
}
