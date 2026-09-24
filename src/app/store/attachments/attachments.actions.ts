import { createAction, props } from '@ngrx/store';
import {
  AttachmentListModel,
  AttachmentModel,
  AttachmentScope,
  AttachmentTreeModel,
} from '../../core/models/attachments';
import { WorkItemMutationError } from '../../core/models/work-items';

const key = '[attachments]';

export const loadList = createAction(
  `${key} Load List`,
  props<{ listKey: string; projectId: string; scope: AttachmentScope }>(),
);
export const loadListSuccess = createAction(
  `${key} Load List Success`,
  props<{ listKey: string; list: AttachmentListModel }>(),
);
export const loadListFailure = createAction(
  `${key} Load List Failure`,
  props<{ listKey: string; error: string }>(),
);
/** The list is gone from the screen: drop it and cancel a load still on its way. */
export const clearList = createAction(`${key} Clear List`, props<{ listKey: string }>());

export const loadTree = createAction(`${key} Load Tree`, props<{ projectId: string }>());
export const loadTreeSuccess = createAction(
  `${key} Load Tree Success`,
  props<{ projectId: string; tree: AttachmentTreeModel }>(),
);
export const loadTreeFailure = createAction(
  `${key} Load Tree Failure`,
  props<{ projectId: string; error: string }>(),
);
export const clearTree = createAction(`${key} Clear Tree`, props<{ projectId: string }>());

/**
 * One file. The file itself waits in `AttachmentUploadFilesService` under `uploadId`: an action
 * carries plain data only.
 */
export const upload = createAction(
  `${key} Upload`,
  props<{
    uploadId: string;
    listKey: string;
    projectId: string;
    workTaskId: string;
    fileName: string;
    size: number;
  }>(),
);
export const uploadProgress = createAction(
  `${key} Upload Progress`,
  props<{ uploadId: string; progress: number }>(),
);
export const uploadSuccess = createAction(
  `${key} Upload Success`,
  props<{ uploadId: string; listKey: string; attachment: AttachmentModel }>(),
);
export const uploadFailure = createAction(
  `${key} Upload Failure`,
  /** `retryable`: the file never reached a verdict (no connection, server down), so sending it again may work. */
  props<{ uploadId: string; error: string; retryable: boolean }>(),
);
/** Cancels an upload in flight or dismisses a failed one. */
export const dismissUpload = createAction(`${key} Dismiss Upload`, props<{ uploadId: string }>());

export const rename = createAction(
  `${key} Rename`,
  props<{ projectId: string; attachmentId: string; baseName: string; fileName: string }>(),
);
export const renameSuccess = createAction(
  `${key} Rename Success`,
  props<{ attachmentId: string; fileName: string }>(),
);
export const renameFailure = createAction(
  `${key} Rename Failure`,
  props<{ attachmentId: string; error: WorkItemMutationError }>(),
);

export const remove = createAction(
  `${key} Remove`,
  props<{ projectId: string; attachmentId: string }>(),
);
export const removeSuccess = createAction(
  `${key} Remove Success`,
  props<{ attachmentId: string }>(),
);
export const removeFailure = createAction(
  `${key} Remove Failure`,
  props<{ attachmentId: string; error: WorkItemMutationError }>(),
);

export const reset = createAction(`${key} Reset`);
