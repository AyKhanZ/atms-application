import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  EMPTY,
  Observable,
  catchError,
  concatMap,
  expand,
  filter,
  groupBy,
  map,
  merge,
  mergeMap,
  of,
  reduce,
  startWith,
  switchMap,
  takeUntil,
} from 'rxjs';
import { toMutationError } from '../../core/utils/http-error.utils';
import {
  WorkTaskBoardService,
  workTaskBoardMaxPageSize,
} from '../../core/services/work-task-board.service';
import { WorkTasksService } from '../../core/services/work-tasks.service';
import { WorkTaskModel } from '../../core/models/work-tasks';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './task-board.actions';

/** A calendar month is read whole; past this many pages the rest is not worth the wait. */
const maxPagesPerMonth = 20;

@Injectable()
export class TaskBoardEffects {
  private readonly actions$ = inject(Actions);
  private readonly board = inject(WorkTaskBoardService);
  private readonly tasks = inject(WorkTasksService);
  private readonly stopped$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );

  /** One stream per list, so loading one column never cancels another. */
  loadPage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadPage),
      groupBy(({ key }) => key, { duration: (group) => this.dropped(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ key, query, order, pageSize, cursor }) =>
            this.board.getPage(query, order, cursor, pageSize).pipe(
              map((page) => ActionsStore.loadPageSuccess({ key, append: cursor !== null, page })),
              catchError(() =>
                of(ActionsStore.loadPageFailure({ key, error: 'Tasks could not be loaded.' })),
              ),
              takeUntil(this.dropped(key)),
            ),
          ),
        ),
      ),
    ),
  );

  loadAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadAll),
      groupBy(({ key }) => key, { duration: (group) => this.dropped(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ key, query, order }) => {
            let pages = 0;
            return this.board.getPage(query, order, null, workTaskBoardMaxPageSize).pipe(
              expand((page) =>
                page.hasMore && page.nextCursor && ++pages < maxPagesPerMonth
                  ? this.board.getPage(query, order, page.nextCursor, workTaskBoardMaxPageSize)
                  : EMPTY,
              ),
              reduce(
                (month: { items: WorkTaskModel[]; hasMore: boolean }, page) => ({
                  items: [...month.items, ...page.items],
                  hasMore: page.hasMore,
                }),
                { items: [], hasMore: false },
              ),
              map(({ items, hasMore }) => ActionsStore.loadAllSuccess({ key, items, hasMore })),
              catchError(() =>
                of(ActionsStore.loadPageFailure({ key, error: 'Tasks could not be loaded.' })),
              ),
              takeUntil(this.dropped(key)),
            );
          }),
        ),
      ),
    ),
  );

  loadCounts$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadCounts),
      switchMap(({ query }) =>
        this.board.getCounts(query).pipe(
          map((counts) => ActionsStore.loadCountsSuccess({ counts })),
          // Counts are a garnish on the column headers; without them the board still works.
          catchError(() => EMPTY),
          takeUntil(this.stopped$),
        ),
      ),
    ),
  );

  loadAssignees$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadAssignees),
      switchMap(({ projectIds }) =>
        this.board.getAssignees(projectIds).pipe(
          map((assignees) => ActionsStore.loadAssigneesSuccess({ assignees })),
          catchError(() => EMPTY),
          takeUntil(this.stopped$),
        ),
      ),
    ),
  );

  /**
   * Moves run one after another, in the order they were made: each depends on the last. Leaving
   * the page does not stop them — the card was already dropped — but signing out drops the queue:
   * what is left must not be sent under whoever signs in next.
   */
  moveTask$ = createEffect(() =>
    this.untilLogout(() =>
      this.actions$.pipe(
        ofType(ActionsStore.moveTask),
        concatMap(
          ({ task, from, to, status, previousWorkTaskId, nextWorkTaskId, completeSubtasks }) =>
            this.tasks
              .moveWorkTask(task.workProjectId, task.id, {
                statusId: status.id,
                previousWorkTaskId,
                nextWorkTaskId,
                completeSubtasks,
              })
              .pipe(
                map(() => ActionsStore.moveTaskSuccess({ taskId: task.id, completeSubtasks })),
                catchError((error: unknown) =>
                  of(ActionsStore.moveTaskFailure({ error: toMutationError(error), from, to })),
                ),
              ),
        ),
      ),
    ),
  );

  changeDeadline$ = createEffect(() =>
    this.untilLogout(() =>
      this.actions$.pipe(
        ofType(ActionsStore.changeDeadline),
        concatMap(({ task, from, to, deadline }) =>
          this.tasks.updateWorkTaskDeadline(task.workProjectId, task.id, deadline).pipe(
            map(() => ActionsStore.changeDeadlineSuccess({ taskId: task.id })),
            catchError((error: unknown) =>
              of(ActionsStore.changeDeadlineFailure({ error: toMutationError(error), from, to })),
            ),
          ),
        ),
      ),
    ),
  );

  /**
   * A list load stops when the view no longer shows the list, the page closes or the session
   * ends: a late answer would otherwise put back a list nobody shows any more.
   */
  private dropped(key: string) {
    return merge(
      this.stopped$,
      this.actions$.pipe(
        ofType(ActionsStore.keepPages),
        filter(({ keys }) => !keys.includes(key)),
      ),
    );
  }

  /** Runs `work` afresh after every sign-out, with whatever it had queued thrown away. */
  private untilLogout<T>(work: () => Observable<T>): Observable<T> {
    return this.actions$.pipe(
      ofType(AuthStoreActions.logoutCompleted),
      startWith(null),
      switchMap(work),
    );
  }
}
