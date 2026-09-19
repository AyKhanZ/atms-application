import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, groupBy, map, merge, mergeMap, of, switchMap, takeUntil } from 'rxjs';
import { WorkTasksService } from '../../core/services/work-tasks.service';
import { toMutationError } from '../../core/utils/http-error.utils';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './work-tasks.actions';

@Injectable()
export class WorkTasksEffects {
  private readonly actions$ = inject(Actions);
  private readonly tasks = inject(WorkTasksService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );

  loadTasks$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadTasks),
      groupBy(({ requestKey }) => requestKey),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ requestKey, projectId, filter, append }) =>
            this.tasks.getWorkTasks(projectId, filter).pipe(
              map((page) => ActionsStore.loadTasksSuccess({ requestKey, append, page })),
              catchError(() =>
                of(
                  ActionsStore.loadTasksFailure({
                    requestKey,
                    error: 'Tasks could not be loaded.',
                  }),
                ),
              ),
              takeUntil(this.stopped(requestKey)),
            ),
          ),
        ),
      ),
    ),
  );

  loadTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadTask),
      switchMap(({ projectId, taskId }) =>
        this.tasks.getWorkTask(projectId, taskId).pipe(
          map((task) => ActionsStore.loadTaskSuccess({ task })),
          catchError(() =>
            of(ActionsStore.loadTaskFailure({ error: 'Task could not be loaded.' })),
          ),
          takeUntil(this.actions$.pipe(ofType(ActionsStore.resetDetail))),
        ),
      ),
    ),
  );

  createTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.createTask),
      switchMap(({ projectId, command }) =>
        this.tasks.createWorkTask(projectId, command).pipe(
          map((id) => ActionsStore.createTaskSuccess({ projectId, id })),
          catchError((error: unknown) =>
            of(ActionsStore.createTaskFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  updateTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.updateTask),
      switchMap(({ projectId, taskId, command }) =>
        this.tasks.updateWorkTask(projectId, taskId, command).pipe(
          map(() => ActionsStore.updateTaskSuccess({ projectId, taskId })),
          catchError((error: unknown) =>
            of(ActionsStore.updateTaskFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  deleteTask$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.deleteTask),
      switchMap(({ projectId, taskId }) =>
        this.tasks.deleteWorkTask(projectId, taskId).pipe(
          map(() => ActionsStore.deleteTaskSuccess({ projectId, taskId })),
          catchError((error: unknown) =>
            of(ActionsStore.deleteTaskFailure({ error: toMutationError(error) })),
          ),
        ),
      ),
    ),
  );

  /**
   * A list load stops when its list is cleared, the store is reset or the session ends: a late
   * answer would otherwise put back a page nobody shows any more.
   */
  private stopped(requestKey: string) {
    return merge(
      this.reset$,
      this.actions$.pipe(
        ofType(ActionsStore.clearPage),
        filter((action) => action.requestKey === requestKey),
      ),
    );
  }
}
