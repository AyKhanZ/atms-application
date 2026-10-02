import { type Action, createReducer, on } from '@ngrx/store';
import { CommentModel } from '../../core/models/comments';
import { AuthStoreActions } from '../auth';
import * as Actions from './comments.actions';
import { CommentListState, CommentsState, initialCommentsState } from './comments.state';

const emptyList: Omit<CommentListState, 'projectId' | 'workTaskId' | 'removedIds'> = {
  items: [],
  nextCursor: null,
  hasMore: false,
  loading: false,
  loadingMore: false,
  error: null,
  loadMoreError: null,
};

/** The comment as a placeholder: who wrote it stays, what it said goes. */
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

/**
 * What a read brought, with the comments deleted after it started turned into placeholders: a delete
 * cannot be undone, so a late answer never shows the text again.
 */
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
  // A late answer for a list that already left the screen must not bring it back.
  if (!list) return state;
  return { ...state, lists: { ...state.lists, [listKey]: change(list) } };
}

/**
 * The one way a comment reaches the list, whether the user sent it or a push brought it: whichever
 * of the two comes second finds it there and only refreshes it, so nothing is shown twice. A deleted
 * one never turns live again, and a placeholder of a comment not on screen is not added on top — it
 * belongs further down, on a page not read yet.
 */
function put(list: CommentListState, comment: CommentModel): CommentListState {
  const shown = list.items.find((item) => item.id === comment.id);
  if (shown) return shown.isDeleted && !comment.isDeleted ? list : replace(list, comment);
  if (comment.isDeleted || list.removedIds.includes(comment.id)) return list;
  return { ...list, items: [comment, ...list.items] };
}

function replace(list: CommentListState, comment: CommentModel): CommentListState {
  return {
    ...list,
    items: list.items.map((item) => (item.id === comment.id ? comment : item)),
  };
}

const reducer = createReducer(
  initialCommentsState,
  // Opening the task again keeps the comments already shown; a skeleton over them would only flash.
  on(
    Actions.load,
    (state, { listKey, projectId, workTaskId }): CommentsState => ({
      ...state,
      lists: {
        ...state.lists,
        [listKey]: {
          ...(state.lists[listKey] ?? { ...emptyList, removedIds: [] }),
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
      update(state, listKey, (list) => ({
        ...list,
        ...emptyList,
        items: live(list, page.items),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      })),
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
        return {
          ...list,
          items: [...list.items, ...live(list, page.items).filter((item) => !known.has(item.id))],
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
          loadingMore: false,
        };
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
  // The card turns into a placeholder at once; who deleted it and when come with the read after.
  on(
    Actions.removeSuccess,
    Actions.removedElsewhere,
    (state, { listKey, commentId }): CommentsState =>
      update(state, listKey, (list) => ({
        ...list,
        items: list.items.map((item) =>
          item.id === commentId && !item.isDeleted ? placeholder(item) : item,
        ),
        removedIds: list.removedIds.includes(commentId)
          ? list.removedIds
          : [...list.removedIds, commentId],
      })),
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
