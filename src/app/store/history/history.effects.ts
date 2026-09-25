import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  Observable,
  catchError,
  exhaustMap,
  filter,
  forkJoin,
  groupBy,
  map,
  merge,
  mergeMap,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';
import { HistoryService } from '../../core/services/history.service';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './history.actions';

@Injectable()
export class HistoryEffects {
  private readonly actions$ = inject(Actions);
  private readonly history = inject(HistoryService);
  private readonly reset$ = this.actions$.pipe(
    ofType(ActionsStore.reset, AuthStoreActions.logoutCompleted),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.load),
      // One stream per history on screen, closed when it leaves: a group that never closed stayed in
      // memory for every ticket and task opened until the page was reloaded.
      groupBy(({ historyKey }) => historyKey, { duration: (group) => this.gone(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          switchMap(({ historyKey, projectId, scope }) =>
            forkJoin({
              page: this.history.getHistory(projectId, scope),
              // The status bar is a summary on top of the list: without it the list still works.
              states: this.history.getStates(projectId, scope).pipe(catchError(() => of(null))),
            }).pipe(
              map(({ page, states }) => ActionsStore.loadSuccess({ historyKey, page, states })),
              catchError(() =>
                of(ActionsStore.loadFailure({ historyKey, error: "Couldn't load history." })),
              ),
              takeUntil(this.gone(historyKey)),
            ),
          ),
        ),
      ),
    ),
  );

  loadMore$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadMore),
      groupBy(({ historyKey }) => historyKey, { duration: (group) => this.gone(group.key) }),
      mergeMap((requests) =>
        requests.pipe(
          exhaustMap(({ historyKey, projectId, scope, cursor }) =>
            this.history.getHistory(projectId, scope, cursor).pipe(
              map((page) => ActionsStore.loadMoreSuccess({ historyKey, page })),
              catchError(() =>
                of(
                  ActionsStore.loadMoreFailure({
                    historyKey,
                    error: "Couldn't load more changes. Try again.",
                  }),
                ),
              ),
              // A reload starts the list over; a later page of the old list would land on it.
              takeUntil(
                merge(
                  this.gone(historyKey),
                  this.actions$.pipe(
                    ofType(ActionsStore.load),
                    filter((action) => action.historyKey === historyKey),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  private gone(historyKey: string): Observable<unknown> {
    return merge(
      this.reset$,
      this.actions$.pipe(
        ofType(ActionsStore.clear),
        filter((action) => action.historyKey === historyKey),
      ),
    );
  }
}
