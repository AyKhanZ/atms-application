import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { CommentModel } from '../../core/models/comments';
import { CommentChangedEvent } from '../../core/models/realtime/comment-changed.event';
import { CommentsService } from '../../core/services/comments.service';
import { RealtimeService } from '../../core/services/realtime.service';
import * as Actions from './comments.actions';
import { CommentsEffects } from './comments.effects';
import { CommentListState, CommentsState } from './comments.state';

describe('CommentsEffects', () => {
  let actions: Subject<Action>;
  let commentChanged: Subject<CommentChangedEvent>;
  let reconnected: Subject<void>;
  let store: MockStore;
  let effects: CommentsEffects;
  let service: {
    getComment: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  const comment = (id: string): CommentModel => ({
    id,
    text: 'Hi',
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

  // One comment on screen: "shown".
  const withList = (change: Partial<CommentListState> = {}) =>
    store.setState({
      comments: {
        lists: {
          'task:t': {
            projectId: 'p',
            workTaskId: 't',
            items: [comment('shown')],
            nextCursor: null,
            hasMore: false,
            loading: false,
            loadingMore: false,
            error: null,
            loadMoreError: null,
            removedIds: [],
            linked: null,
            linkedId: null,
            linkedError: null,
            ...change,
          },
        },
      } satisfies CommentsState,
    });

  const event = (change: Partial<CommentChangedEvent> = {}): CommentChangedEvent => ({
    workTaskId: 't',
    commentId: 'new',
    action: 'created',
    ...change,
  });

  const collect = (effect: 'liveReceived$' | 'liveRemoved$' | 'loadLinked$') => {
    const emitted: Action[] = [];
    const source: Observable<Action> = effects[effect];
    source.subscribe((action) => emitted.push(action));
    return emitted;
  };

  beforeEach(() => {
    actions = new Subject<Action>();
    commentChanged = new Subject<CommentChangedEvent>();
    reconnected = new Subject<void>();
    service = {
      getComment: vi.fn((_: string, id: string) => of(comment(id))),
      create: vi.fn(() => of(comment('c1'))),
      delete: vi.fn(() => of(undefined)),
    };
    TestBed.configureTestingModule({
      providers: [
        CommentsEffects,
        provideMockActions(() => actions),
        provideMockStore({ initialState: { comments: { lists: {} } } }),
        { provide: CommentsService, useValue: service },
        {
          provide: RealtimeService,
          useValue: { commentChanged$: commentChanged, reconnected$: reconnected },
        },
      ],
    });
    store = TestBed.inject(MockStore);
    effects = TestBed.inject(CommentsEffects);
  });

  it('reads only the new comment, never the page', () => {
    withList();
    const emitted = collect('liveReceived$');

    commentChanged.next(event());

    expect(service.getComment).toHaveBeenCalledWith('p', 'new');
    expect(emitted).toEqual([Actions.received({ listKey: 'task:t', comment: comment('new') })]);
  });

  it('reads an edit only of a comment on screen', () => {
    withList();
    const emitted = collect('liveReceived$');

    commentChanged.next(event({ commentId: 'shown', action: 'updated' }));
    commentChanged.next(event({ commentId: 'on-a-later-page', action: 'updated' }));

    expect(emitted).toHaveLength(1);
    expect(service.getComment).toHaveBeenCalledTimes(1);
  });

  it('reads a linked comment alone, only from its own task, and says when it is not there', () => {
    const emitted = collect('loadLinked$');
    service.getComment
      .mockReturnValueOnce(of(comment('old')))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 404 })));
    const ask = (commentId: string) =>
      Actions.loadLinked({ listKey: 'task:t', projectId: 'p', workTaskId: 't', commentId });

    actions.next(ask('old'));
    actions.next(ask('elsewhere'));

    expect(service.getComment).toHaveBeenCalledWith('p', 'old', 't');
    expect(emitted).toEqual([
      Actions.loadLinkedSuccess({ listKey: 'task:t', comment: comment('old') }),
      Actions.loadLinkedFailure({
        listKey: 'task:t',
        commentId: 'elsewhere',
        error: "The linked comment couldn't be found.",
      }),
    ]);
  });

  it('keeps the linked comment above the list live, like one on screen', () => {
    withList({ linked: comment('old'), linkedId: 'old' });
    const emitted = collect('liveReceived$');

    commentChanged.next(event({ commentId: 'old', action: 'updated' }));

    expect(emitted).toEqual([Actions.received({ listKey: 'task:t', comment: comment('old') })]);
  });

  it('marks a deleted comment at once and reads its placeholder only when it is on screen', () => {
    withList();
    const removed = collect('liveRemoved$');
    const read = collect('liveReceived$');

    commentChanged.next(event({ commentId: 'shown', action: 'deleted' }));
    commentChanged.next(event({ commentId: 'on-a-later-page', action: 'deleted' }));

    expect(removed).toEqual([
      Actions.removedElsewhere({ listKey: 'task:t', commentId: 'shown' }),
      Actions.removedElsewhere({ listKey: 'task:t', commentId: 'on-a-later-page' }),
    ]);
    expect(service.getComment).toHaveBeenCalledTimes(1);
    expect(service.getComment).toHaveBeenCalledWith('p', 'shown');
    expect(read).toHaveLength(1);
  });

  it('ignores changes of a task whose comments are not on screen', () => {
    withList();
    const emitted = collect('liveReceived$');

    commentChanged.next(event({ workTaskId: 'another' }));

    expect(emitted).toEqual([]);
  });

  it('shows a comment deleted before it was read by nobody', () => {
    withList();
    service.getComment.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const emitted = collect('liveReceived$');

    commentChanged.next(event());

    expect(emitted).toEqual([]);
  });

  it('treats a comment already deleted by someone else as deleted', () => {
    service.delete.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    const emitted: Action[] = [];
    effects.remove$.subscribe((action) => emitted.push(action));

    actions.next(Actions.remove({ listKey: 'task:t', projectId: 'p', commentId: 'c1' }));

    expect(emitted).toEqual([Actions.removeSuccess({ listKey: 'task:t', commentId: 'c1' })]);
  });

  it('tells the editor why a comment was refused', () => {
    service.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: [{ field: 'Text', error: 'Too long.' }] },
          }),
      ),
    );
    const emitted: Action[] = [];
    effects.create$.subscribe((action) => emitted.push(action));

    actions.next(
      Actions.create({
        requestId: 'q',
        listKey: 'task:t',
        projectId: 'p',
        workTaskId: 't',
        text: 'x',
      }),
    );

    expect(emitted).toEqual([
      Actions.createFailure({ requestId: 'q', error: { status: 400, message: 'Too long.' } }),
    ]);
  });

  it('reads every list on screen again after a reconnect', () => {
    withList();
    const emitted: Action[] = [];
    effects.reconnected$.subscribe((action) => emitted.push(action));

    reconnected.next();

    expect(emitted).toEqual([Actions.load({ listKey: 'task:t', projectId: 'p', workTaskId: 't' })]);
  });
});
