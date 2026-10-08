import { type Action, createReducer, on } from '@ngrx/store';
import { CommentModel } from '../../core/models/comments';
import { AuthStoreActions } from '../auth';
import * as Actions from './comments.actions';
import { CommentListState, CommentsState, initialCommentsState } from './comments.state';

const emptyList: Omit<
  CommentListState,
  'projectId' | 'workTaskId' | 'removedIds' | 'linked' | 'linkedId' | 'linkedError'
> = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
};

const keptAcrossReads: Pick<
  CommentListState,
  'removedIds' | 'linked' | 'linkedId' | 'linkedError'
> = {
  removedIds: [],
  linked: null,
  linkedId: null,
  linkedError: null,
};

// author stays, text goes
function placeholder(comment: CommentModel): CommentModel {
  return {
    ...comment,
    text: '',
    mentions: [],
    references: [],
    isDeleted: true,
    deletedAt: comment.deletedAt ?? null,
    deletedBy: comment.deletedBy ?? null,
    canEdit: false,
    canDelete: false,
  };
}

// deleted after the read started -> placeholder, a late answer never shows the text again
function live(list: CommentListState, items: readonly CommentModel[]): CommentModel[] {
  return items.map((item) =>
    !item.isDeleted && list.removedIds.includes(item.id) ? placeholder(item) : item,
  );
}

function update(
  state: CommentsState,
  listKey: string,
  change: (list: CommentListState) => CommentListState,
): CommentsState {
  const list = state.lists[listKey];
  // late answer for a list that left must not bring it back
  if (!list) return state;
  return { ...state, lists: { ...state.lists, [listKey]: change(list) } };
}

// whichever comes second (own send or push) only refreshes, nothing shown twice
// a deleted one never comes back; a placeholder not on screen isnt added on top
function put(list: CommentListState, comment: CommentModel): CommentListState {
  if (list.linked?.id === comment.id) {
    return list.linked.isDeleted && !comment.isDeleted ? list : { ...list, linked: comment };
  }
  const shown = list.items.find((item) => item.id === comment.id);
  if (shown) return shown.isDeleted && !comment.isDeleted ? list : replace(list, comment);
  if (comment.isDeleted || list.removedIds.includes(comment.id)) return list;
  return { ...list, items: [comment, ...list.items] };
}

function settleLinked(list: CommentListState): CommentListState {
  return list.linked && list.items.some((item) => item.id === list.linked?.id)
    ? { ...list, linked: null }
    : list;
}

function replace(list: CommentListState, comment: CommentModel): CommentListState {
  return {
    ...list,
    items: list.items.map((item) => (item.id === comment.id ? comment : item)),
  };
}

const reducer = createReducer(
  initialCommentsState,
  // keep comments already shown, a skeleton would only flash
  on(
    Actions.load,
    (state, { listKey, projectId, workTaskId }): CommentsState => ({
      ...state,
      lists: {
        ...state.lists,
        [listKey]: {
          ...(state.lists[listKey] ?? { ...emptyList, ...keptAcrossReads }),
          projectId,
          workTaskId,
          loading: true,
          error: null,
        },
      },
    }),
  ),
  on(
    Actions.loadSuccess,
    (state, { listKey, page }): CommentsState =>
      update(state, listKey, (list) =>
        settleLinked({
          ...list,
          ...emptyList,
          items: live(list, page.items),
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        }),
      ),
  ),
  on(
    Actions.loadFailure,
    (state, { listKey, error }): CommentsState =>
      update(state, listKey, (list) => ({ ...list, loading: false, error })),
  ),
  on(
    Actions.loadMore,
    (state, { listKey }): CommentsState =>
      update(state, listKey, (list) => ({ ...list, loadingMore: true, loadMoreError: null })),
  ),
  on(
    Actions.loadMoreSuccess,
    (state, { listKey, page }): CommentsState =>
      update(state, listKey, (list) => {
        const known = new Set(list.items.map((item) => item.id));
        return settleLinked({
          ...list,
          items: [...list.items, ...live(list, page.items).filter((item) => !known.has(item.id))],
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          loadingMore: false,
        });
      }),
  ),
  on(
    Actions.loadMoreFailure,
    (state, { listKey, error }): CommentsState =>
      update(state, listKey, (list) => ({ ...list, loadingMore: false, loadMoreError: error })),
  ),
  on(
    Actions.createSuccess,
    Actions.received,
    (state, { listKey, comment }): CommentsState =>
      update(state, listKey, (list) => put(list, comment)),
  ),
  on(
    Actions.updateSuccess,
    (state, { listKey, comment }): CommentsState =>
      update(state, listKey, (list) => put(list, comment)),
  ),
  // who and when come with the read after
  on(
    Actions.removeSuccess,
    Actions.removedElsewhere,
    (state, { listKey, commentId }): CommentsState =>
      update(state, listKey, (list) => ({
        ...list,
        items: list.items.map((item) =>
          item.id === commentId && !item.isDeleted ? placeholder(item) : item,
        ),
        linked:
          list.linked?.id === commentId && !list.linked.isDeleted
            ? placeholder(list.linked)
            : list.linked,
        removedIds: list.removedIds.includes(commentId)
          ? list.removedIds
          : [...list.removedIds, commentId],
      })),
  ),
  on(
    Actions.loadLinked,
    (state, { listKey, commentId }): CommentsState =>
      update(state, listKey, (list) => ({
        ...list,
        linked: null,
        linkedId: commentId,
        linkedError: null,
      })),
  ),
  on(
    Actions.loadLinkedSuccess,
    (state, { listKey, comment }): CommentsState =>
      update(state, listKey, (list) => {
        if (list.linkedId !== comment.id) return list;
        if (list.items.some((item) => item.id === comment.id)) return put(list, comment);
        const [linked] = live(list, [comment]);
        return { ...list, linked };
      }),
  ),
  on(
    Actions.loadLinkedFailure,
    (state, { listKey, commentId, error }): CommentsState =>
      update(state, listKey, (list) =>
        list.linkedId === commentId ? { ...list, linkedError: error } : list,
      ),
  ),
  on(
    Actions.clearLinked,
    (state, { listKey }): CommentsState =>
      update(state, listKey, (list) => ({ ...list, linked: null, linkedId: null, linkedError: null })),
  ),
  on(Actions.clear, (state, { listKey }): CommentsState => {
    const lists = { ...state.lists };
    delete lists[listKey];
    return { ...state, lists };
  }),
  on(Actions.reset, (): CommentsState => initialCommentsState),
  on(AuthStoreActions.logoutCompleted, (): CommentsState => initialCommentsState),
);

export function commentsReducer(state: CommentsState | undefined, action: Action): CommentsState {
  return reducer(state, action);
}
