import {
  AttachmentModel,
  AttachmentTreeModel,
  AttachmentUploadModel,
} from '../../core/models/attachments';

export interface AttachmentListState {
  items: AttachmentModel[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export interface AttachmentTreeState {
  tree: AttachmentTreeModel | null;
  loading: boolean;
  error: string | null;
}

export interface AttachmentsState {
  // task:<id>, subtasks:<id>, ticket:<id>
  lists: Record<string, AttachmentListState>;
  trees: Record<string, AttachmentTreeState>;
  uploads: AttachmentUploadModel[];
  pendingIds: string[];
}

export const initialAttachmentsState: AttachmentsState = {
  lists: {},
  trees: {},
  uploads: [],
  pendingIds: [],
};
