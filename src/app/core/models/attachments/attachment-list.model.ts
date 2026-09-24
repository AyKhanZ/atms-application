import { AttachmentModel } from './attachment.model';

export interface AttachmentListModel {
  items: AttachmentModel[];
  /** The server stops at 1000 files; true when there were more. */
  hasMore: boolean;
}
