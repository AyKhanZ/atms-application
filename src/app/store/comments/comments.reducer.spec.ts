import { CommentModel, CommentPageModel } from '../../core/models/comments';
import { AuthStoreActions } from '../auth';
import * as Actions from './comments.actions';
import { commentsReducer } from './comments.reducer';
import { CommentsState, initialCommentsState } from './comments.state';

const comment = (id: string): CommentModel => ({
  id,
  text: `Text ${id}`,
  createdAt: '2026-09-26T10:00:00Z',
  createdBy: { id: 'u', name: 'Ann', surname: 'Lee' },
  updatedAt: null,
  isDeleted: false,
  deletedAt: null,
  deletedBy: null,
  canEdit: true,
  canDelete: true,
  mentions: [],
  references: [],
});

const page = (ids: string[], nextCursor: string | null = null): CommentPageModel => ({
  items: ids.map(comment),
  nextCursor,
  hasMore: !!nextCursor,
  pageSize: 20,
});

const listKey = 'task:t';
const ids = (state: CommentsState) => state.lists[listKey].items.map((item) => item.id);
/** The rows as the reader sees them: a deleted one by id with a cross. */
const shown = (state: CommentsState) =>
  state.lists[listKey].items.map((item) => (item.isDeleted ? `×${item.id}` : item.id));

describe('commentsReducer', () => {
  const opened = commentsReducer(
    initialCommentsState,
    Actions.load({ listKey, projectId: 'p', workTaskId: 't' }),
  );
  const loaded = commentsReducer(
    opened,
    Actions.loadSuccess({ listKey, page: page(['b', 'a'], 'next') }),
  );

  it('remembers the task of the list and keeps the rows while it reads them again', () => {
    const state = commentsReducer(
      loaded,
      Actions.load({ listKey, projectId: 'p', workTaskId: 't' }),
    );

    expect(state.lists[listKey]).toEqual(
      expect.objectContaining({ projectId: 'p', workTaskId: 't', loading: true }),
    );
    expect(ids(state)).toEqual(['b', 'a']);
  });

  it('never shows the text of a comment deleted while its read was on the way', () => {
    const deleted = commentsReducer(loaded, Actions.removedElsewhere({ listKey, commentId: 'b' }));
    const late = [
      Actions.received({ listKey, comment: comment('b') }),
      Actions.loadSuccess({ listKey, page: page(['b', 'a']) }),
      Actions.loadMoreSuccess({ listKey, page: page(['b']) }),
    ].reduce(commentsReducer, deleted);

    expect(shown(late)).toEqual(['×b', 'a']);
    expect(late.lists[listKey].items[0].text).toBe('');
  });

  it('does not add a deleted comment on top when it is not on screen', () => {
    const elsewhere = commentsReducer(
      loaded,
      Actions.removedElsewhere({ listKey, commentId: 'n' }),
    );
    const state = [
      Actions.received({ listKey, comment: comment('n') }),
      Actions.received({ listKey, comment: { ...comment('z'), isDeleted: true } }),
    ].reduce(commentsReducer, elsewhere);

    expect(shown(state)).toEqual(['b', 'a']);
  });

  it('ignores an answer for a list that already left the screen', () => {
    const state = commentsReducer(
      initialCommentsState,
      Actions.loadSuccess({ listKey, page: page(['a']) }),
    );

    expect(state.lists[listKey]).toBeUndefined();
  });

  it('appends the next page without repeating a comment', () => {
    const state = commentsReducer(
      loaded,
      Actions.loadMoreSuccess({ listKey, page: page(['a', 'z']) }),
    );

    expect(ids(state)).toEqual(['b', 'a', 'z']);
    expect(state.lists[listKey].hasMore).toBe(false);
  });

  it('puts a new comment first, once, whether the answer or the push comes first', () => {
    const sent = Actions.createSuccess({ requestId: 'q', listKey, comment: comment('n') });
    const pushed = Actions.received({ listKey, comment: comment('n') });

    expect(ids([sent, pushed].reduce(commentsReducer, loaded))).toEqual(['n', 'b', 'a']);
    expect(ids([pushed, sent].reduce(commentsReducer, loaded))).toEqual(['n', 'b', 'a']);
  });

  it('changes an edited comment in place', () => {
    const edited = { ...comment('a'), text: 'Edited', updatedAt: '2026-09-26T11:00:00Z' };
    const state = commentsReducer(loaded, Actions.received({ listKey, comment: edited }));

    expect(ids(state)).toEqual(['b', 'a']);
    expect(state.lists[listKey].items[1].text).toBe('Edited');
  });

  it('leaves a placeholder in place of a deleted comment, by the user or by someone else', () => {
    const state = [
      Actions.removeSuccess({ listKey, commentId: 'a' }),
      Actions.removedElsewhere({ listKey, commentId: 'b' }),
    ].reduce(commentsReducer, loaded);

    expect(shown(state)).toEqual(['×b', '×a']);
    expect(state.lists[listKey].items.every((item) => !item.canEdit && !item.canDelete)).toBe(true);
  });

  it('fills in who deleted it when the read arrives, and a late edit does not undo it', () => {
    const manager = { id: 'm', name: 'Rustam', surname: 'Agaev' };
    const read = { ...comment('a'), text: '', isDeleted: true, deletedBy: manager };
    const state = [
      Actions.removedElsewhere({ listKey, commentId: 'a' }),
      Actions.received({ listKey, comment: read }),
      Actions.received({ listKey, comment: { ...comment('a'), text: 'Edited' } }),
    ].reduce(commentsReducer, loaded);

    expect(state.lists[listKey].items[1]).toEqual(read);
  });

  it('drops the list when it leaves the screen and everything on logout', () => {
    expect(commentsReducer(loaded, Actions.clear({ listKey })).lists[listKey]).toBeUndefined();
    expect(commentsReducer(loaded, AuthStoreActions.logoutCompleted())).toEqual(
      initialCommentsState,
    );
  });
});
