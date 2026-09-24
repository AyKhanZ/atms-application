import { type Action, createReducer, on } from '@ngrx/store';
import { AttachmentModel } from '../../core/models/attachments';
import { AuthStoreActions } from '../auth';
import * as Actions from './attachments.actions';
import { AttachmentListState, AttachmentsState, initialAttachmentsState } from './attachments.state';

function mapLists(
  lists: Record<string, AttachmentListState>,
  change: (items: AttachmentModel[]) => AttachmentModel[],
): Record<string, AttachmentListState> {
  return Object.fromEntries(
    Object.entries(lists).map(([listKey, list]) => [listKey, { ...list, items: change(list.items) }]),
  );
}

const reducer = createReducer(
  initialAttachmentsState,
  // A reload keeps the rows already shown: opening the tab again must not flash a skeleton over a
  // list that is almost certainly unchanged.
  on(
    Actions.loadList,
    (state, { listKey }): AttachmentsState => ({
      ...state,
      lists: {
        ...state.lists,
        [listKey]: {
          items: state.lists[listKey]?.items ?? [],
          hasMore: state.lists[listKey]?.hasMore ?? false,
          loading: true,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadListSuccess,
    (state, { listKey, list }): AttachmentsState => ({
      ...state,
      lists: {
        ...state.lists,
        [listKey]: { items: list.items, hasMore: list.hasMore, loading: false, error: null },
      },
    }),
  ),
  on(
    Actions.loadListFailure,
    (state, { listKey, error }): AttachmentsState => ({
      ...state,
      lists: {
        ...state.lists,
        [listKey]: {
          ...(state.lists[listKey] ?? { items: [], hasMore: false }),
          loading: false,
          error,
        },
      },
    }),
  ),
  on(Actions.clearList, (state, { listKey }): AttachmentsState => {
    const lists = { ...state.lists };
    delete lists[listKey];
    return { ...state, lists };
  }),
  on(
    Actions.loadTree,
    (state, { projectId }): AttachmentsState => ({
      ...state,
      trees: {
        ...state.trees,
        [projectId]: { tree: state.trees[projectId]?.tree ?? null, loading: true, error: null },
      },
    }),
  ),
  on(
    Actions.loadTreeSuccess,
    (state, { projectId, tree }): AttachmentsState => ({
      ...state,
      trees: { ...state.trees, [projectId]: { tree, loading: false, error: null } },
    }),
  ),
  on(
    Actions.loadTreeFailure,
    (state, { projectId, error }): AttachmentsState => ({
      ...state,
      trees: {
        ...state.trees,
        [projectId]: { tree: state.trees[projectId]?.tree ?? null, loading: false, error },
      },
    }),
  ),
  on(Actions.clearTree, (state, { projectId }): AttachmentsState => {
    const trees = { ...state.trees };
    delete trees[projectId];
    return { ...state, trees };
  }),
  on(
    Actions.upload,
    (state, { uploadId, listKey, file }): AttachmentsState => ({
      ...state,
      uploads: [
        ...state.uploads,
        {
          uploadId,
          listKey,
          fileName: file.name,
          size: file.size,
          progress: 0,
          error: null,
          retryable: false,
        },
      ],
    }),
  ),
  on(
    Actions.uploadProgress,
    (state, { uploadId, progress }): AttachmentsState => ({
      ...state,
      uploads: state.uploads.map((upload) =>
        upload.uploadId === uploadId ? { ...upload, progress } : upload,
      ),
    }),
  ),
  on(
    Actions.uploadSuccess,
    (state, { uploadId, listKey, attachment }): AttachmentsState => {
      const list = state.lists[listKey];
      return {
        ...state,
        uploads: state.uploads.filter((upload) => upload.uploadId !== uploadId),
        lists: list
          ? { ...state.lists, [listKey]: { ...list, items: [attachment, ...list.items] } }
          : state.lists,
      };
    },
  ),
  on(
    Actions.uploadFailure,
    (state, { uploadId, error, retryable }): AttachmentsState => ({
      ...state,
      uploads: state.uploads.map((upload) =>
        upload.uploadId === uploadId ? { ...upload, error, retryable } : upload,
      ),
    }),
  ),
  on(
    Actions.dismissUpload,
    (state, { uploadId }): AttachmentsState => ({
      ...state,
      uploads: state.uploads.filter((upload) => upload.uploadId !== uploadId),
    }),
  ),
  on(
    Actions.rename,
    Actions.remove,
    (state, { attachmentId }): AttachmentsState => ({
      ...state,
      pendingIds: [...state.pendingIds, attachmentId],
    }),
  ),
  on(
    Actions.renameSuccess,
    (state, { attachmentId, fileName }): AttachmentsState => ({
      ...state,
      pendingIds: state.pendingIds.filter((id) => id !== attachmentId),
      lists: mapLists(state.lists, (items) =>
        items.map((item) => (item.id === attachmentId ? { ...item, fileName } : item)),
      ),
    }),
  ),
  on(
    Actions.removeSuccess,
    (state, { attachmentId }): AttachmentsState => ({
      ...state,
      pendingIds: state.pendingIds.filter((id) => id !== attachmentId),
      lists: mapLists(state.lists, (items) => items.filter((item) => item.id !== attachmentId)),
    }),
  ),
  on(
    Actions.renameFailure,
    Actions.removeFailure,
    (state, { attachmentId }): AttachmentsState => ({
      ...state,
      pendingIds: state.pendingIds.filter((id) => id !== attachmentId),
    }),
  ),
  on(Actions.reset, (): AttachmentsState => initialAttachmentsState),
  // Everything here is the signed-in user's; none of it may outlive the session.
  on(AuthStoreActions.logoutCompleted, (): AttachmentsState => initialAttachmentsState),
);

export function attachmentsReducer(
  state: AttachmentsState | undefined,
  action: Action,
): AttachmentsState {
  return reducer(state, action);
}
