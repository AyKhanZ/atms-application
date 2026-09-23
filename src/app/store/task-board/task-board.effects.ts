import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  EMPTY,
  catchError,
  concatMap,
  expand,
  groupBy,
  map,
  mergeMap,
  of,
  reduce,
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
      groupBy(({ key }) => key),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ key, query, order, pageSize, cursor }) =>
            this.board.getPage(query, order, cursor, pageSize).pipe(
              map((page) => ActionsStore.loadPageSuccess({ key, append: cursor !== null, page })),
              catchError(() =>
                of(ActionsStore.loadPageFailure({ key, error: 'Tasks could not be loaded.' })),
              ),
              takeUntil(this.stopped$),
            ),
          ),
        ),
      ),
    ),
  );

  loadAll$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadAll),
      groupBy(({ key }) => key),
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
              reduce((items: WorkTaskModel[], page) => [...items, ...page.items], []),
              map((items) => ActionsStore.loadAllSuccess({ key, items })),
              catchError(() =>
                of(ActionsStore.loadPageFailure({ key, error: 'Tasks could not be loaded.' })),
              ),
              takeUntil(this.stopped$),
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

  /** Moves run one after another, in the order they were made: each depends on the last. */
  moveTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.moveTask),
      concatMap(({ task, status, previousWorkTaskId, nextWorkTaskId, completeSubtasks }) =>
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
              of(ActionsStore.moveTaskFailure({ error: toMutationError(error) })),
            ),
          ),
      ),
    ),
  );

  changeDeadline$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.changeDeadline),
      concatMap(({ task, deadline }) =>
        this.tasks.updateWorkTaskDeadline(task.workProjectId, task.id, deadline).pipe(
          map(() => ActionsStore.changeDeadlineSuccess({ taskId: task.id })),
          catchError((error: unknown) =>
            of(ActionsStore.changeDeadlineFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );
}
