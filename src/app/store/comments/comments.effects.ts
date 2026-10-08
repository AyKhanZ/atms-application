import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  EMPTY,
  Observable,
  catchError,
  debounceTime,
  exhaustMap,
  filter,
  groupBy,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  withLatestFrom,
} from 'rxjs';
import { CommentsService } from '../../core/services/comments.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { toMutationError } from '../../core/utils/http-error.utils';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './comments.actions';
import * as Selectors from './comments.selectors';
import { CommentListState, commentsKey } from './comments.state';

@Injectable()
export class CommentsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly comments = inject(CommentsService);
  private readonly realtime = inject(RealtimeService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );
  private readonly changes$ = this.realtime.commentChanged$.pipe(
    withLatestFrom(this.store.select(Selectors.getLists)),
    map(([event, lists]) => ({ event, list: lists[commentsKey(event.workTaskId)] })),
    filter((change): change is typeof change & { list: CommentListState } => !!change.list),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.load),
      groupBy(({ listKey }) => listKey, { duration: (group) => this.gone(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ listKey, projectId, workTaskId }) =>
            this.comments.getComments(projectId, workTaskId).pipe(
              map((page) => ActionsStore.loadSuccess({ listKey, page })),
              catchError(() =>
                of(ActionsStore.loadFailure({ listKey, error: "Couldn't load comments." })),
              ),
              takeUntil(this.gone(listKey)),
            ),
          ),
        ),
      ),
    ),
  );

  loadMore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadMore),
      groupBy(({ listKey }) => listKey, { duration: (group) => this.gone(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          exhaustMap(({ listKey, projectId, workTaskId, cursor }) =>
            this.comments.getComments(projectId, workTaskId, cursor).pipe(
              map((page) => ActionsStore.loadMoreSuccess({ listKey, page })),
              catchError(() =>
                of(
                  ActionsStore.loadMoreFailure({
                    listKey,
                    error: "Couldn't load more comments. Try again.",
                  }),
                ),
              ),
              // a reload starts over, a later page of the old list would land on it
              takeUntil(merge(this.gone(listKey), this.reloaded(listKey))),
            ),
          ),
        ),
      ),
    ),
  );

  // only from this task, a link with another tasks comment finds nothing
  // a second link replaces the first
  loadLinked$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadLinked),
      groupBy(({ listKey }) => listKey, { duration: (group) => this.gone(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ listKey, projectId, workTaskId, commentId }) =>
            this.comments.getComment(projectId, commentId, workTaskId).pipe(
              map((comment) => ActionsStore.loadLinkedSuccess({ listKey, comment })),
              catchError(() =>
                of(
                  ActionsStore.loadLinkedFailure({
                    listKey,
                    commentId,
                    error: "The linked comment couldn't be found.",
                  }),
                ),
              ),
              takeUntil(this.gone(listKey)),
            ),
          ),
        ),
      ),
    ),
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.create),
      mergeMap(({ requestId, listKey, projectId, workTaskId, text }) =>
        this.comments.create(projectId, { workTaskId, text }).pipe(
          map((comment) => ActionsStore.createSuccess({ requestId, listKey, comment })),
          catchError((error: unknown) =>
            of(ActionsStore.createFailure({ requestId, error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.update),
      mergeMap(({ listKey, projectId, commentId, text }) =>
        this.comments.update(projectId, commentId, { text }).pipe(
          map((comment) => ActionsStore.updateSuccess({ listKey, comment })),
          catchError((error: unknown) =>
            of(ActionsStore.updateFailure({ commentId, error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  remove$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.remove),
      mergeMap(({ listKey, projectId, commentId }) =>
        this.comments.delete(projectId, commentId).pipe(
          map(() => ActionsStore.removeSuccess({ listKey, commentId })),
          catchError((error: unknown) => {
            const refused = toMutationError(error);
            // already gone = what the user wanted
            return refused.status === 404
              ? of(ActionsStore.removeSuccess({ listKey, commentId }))
              : of(ActionsStore.removeFailure({ commentId, error: refused }));
          }),
        ),
      ),
    ),
  );

  // placeholder at once, before the read says who did it
  liveRemoved$ = createEffect(() =>
    this.changes$.pipe(
      filter(({ event }) => event.action === 'deleted'),
      map(({ event }) =>
        ActionsStore.removedElsewhere({
          listKey: commentsKey(event.workTaskId),
          commentId: event.commentId,
        }),
      ),
    ),
  );

  // one comment is read, never the whole page however many people watch
  // own changes come back too and only refresh; changes on pages not opened yet arent read
  liveReceived$ = createEffect(() =>
    this.changes$.pipe(
      filter(
        ({ event, list }) =>
          event.action === 'created' ||
          list.linked?.id === event.commentId ||
          list.items.some((item) => item.id === event.commentId),
      ),
      // only the latest read lands, a delete cancels the read of the edit before it
      groupBy(({ event }) => event.commentId, {
        duration: (group) => group.pipe(debounceTime(30_000)),
      }),
      mergeMap((changes) =>
        changes.pipe(
          switchMap(({ event, list }) =>
            this.comments.getComment(list.projectId, event.commentId).pipe(
              map((comment) =>
                ActionsStore.received({ listKey: commentsKey(event.workTaskId), comment }),
              ),
              // gone with its task meanwhile
              catchError(() => EMPTY),
              takeUntil(this.gone(commentsKey(event.workTaskId))),
            ),
          ),
        ),
      ),
    ),
  );

  // pushes missed while offline: read every list on screen again
  reconnected$ = createEffect(() =>
    this.realtime.reconnected$.pipe(
      withLatestFrom(this.store.select(Selectors.getLists)),
      mergeMap(([, lists]) =>
        Object.entries(lists).map(([listKey, { projectId, workTaskId }]) =>
          ActionsStore.load({ listKey, projectId, workTaskId }),
        ),
      ),
    ),
  );

  private gone(listKey: string): Observable<unknown> {
    return merge(
      this.reset$,
      this.actions$.pipe(
        ofType(ActionsStore.clear),
        filter((action) => action.listKey === listKey),
      ),
    );
  }

  private reloaded(listKey: string): Observable<unknown> {
    return this.actions$.pipe(
      ofType(ActionsStore.load),
      filter((action) => action.listKey === listKey),
    );
  }
}
