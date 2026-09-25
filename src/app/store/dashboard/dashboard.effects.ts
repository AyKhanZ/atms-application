import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  asyncScheduler,
  EMPTY,
  catchError,
  debounceTime,
  filter,
  map,
  mergeMap,
  of,
  switchMap,
  takeUntil,
  tap,
  throttleTime,
  withLatestFrom,
} from 'rxjs';
import { createDefaultWorkProjectListFilter } from '../../core/models/work-projects';
import { DashboardService } from '../../core/services/dashboard.service';
import { DictionaryService } from '../../core/services/dictionary.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import { AuthStoreActions } from '../auth';
import * as ActionsStore from './dashboard.actions';
import * as Selectors from './dashboard.selectors';

@Injectable()
export class DashboardEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly document = inject(DOCUMENT);
  private readonly dashboard = inject(DashboardService);
  private readonly projects = inject(WorkProjectsService);
  private readonly dictionaries = inject(DictionaryService);
  private readonly realtime = inject(RealtimeService);
  private readonly joinedProjects = new Set<string>();
  private readonly exit$ = this.actions$.pipe(
    ofType(ActionsStore.leave, AuthStoreActions.logoutCompleted),
  );

  enter$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.enter),
      mergeMap(({ query }) => [
        ActionsStore.load({ query }),
        ActionsStore.loadProjects(),
        ActionsStore.loadPriorities(),
      ]),
    ),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.load),
      switchMap(({ query }) =>
        this.dashboard.getDashboard(query).pipe(
          map((model) => ActionsStore.loadSuccess({ query, model })),
          catchError(() =>
            of(ActionsStore.loadFailure({ query, error: "Couldn't load dashboard. Try again." })),
          ),
          takeUntil(this.exit$),
        ),
      ),
    ),
  );

  refresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.refresh),
      withLatestFrom(this.store.select(Selectors.getState)),
      filter(([, state]) => state.active && this.document.visibilityState === 'visible'),
      map(([, state]) => ActionsStore.load({ query: state.query })),
    ),
  );

  projectList$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadProjects),
      switchMap(() =>
        this.projects.getProjects({ ...createDefaultWorkProjectListFilter(), pageSize: 50 }).pipe(
          map(({ items }) =>
            ActionsStore.loadProjectsSuccess({
              options: items.map(({ id, code, title }) => ({ id, code, title })),
              groupProjectIds: items.slice(0, 30).map(({ id }) => id),
            }),
          ),
          catchError(() => of(ActionsStore.loadProjectsFailure())),
          takeUntil(this.exit$),
        ),
      ),
    ),
  );

  searchProjects$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.searchProjects),
      debounceTime(250),
      withLatestFrom(this.store.select(Selectors.getState)),
      filter(([, state]) => state.active),
      switchMap(([{ search }]) =>
        this.projects
          .getProjects({
            ...createDefaultWorkProjectListFilter(),
            pageSize: 50,
            search: search || undefined,
          })
          .pipe(
            map(({ items }) =>
              ActionsStore.searchProjectsSuccess({
                options: items.map(({ id, code, title }) => ({ id, code, title })),
              }),
            ),
            catchError(() => of(ActionsStore.searchProjectsSuccess({ options: [] }))),
            takeUntil(this.exit$),
          ),
      ),
    ),
  );

  selectedProject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadSelectedProject),
      switchMap(({ id }) =>
        this.projects.getProject(id).pipe(
          map(({ code, title }) =>
            ActionsStore.loadSelectedProjectSuccess({ option: { id, code, title } }),
          ),
          catchError(() => EMPTY),
          takeUntil(this.exit$),
        ),
      ),
    ),
  );

  priorities$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActionsStore.loadPriorities),
      switchMap(() =>
        this.dictionaries.getWorkItemPriorityDictionaries().pipe(
          map((priorities) => ActionsStore.loadPrioritiesSuccess({ priorities })),
          catchError(() => of(ActionsStore.loadPrioritiesSuccess({ priorities: [] }))),
          takeUntil(this.exit$),
        ),
      ),
    ),
  );

  workChanged$ = createEffect(() =>
    this.realtime.workItemChanged$.pipe(
      withLatestFrom(this.store.select(Selectors.getState)),
      filter(
        ([event, state]) =>
          state.active &&
          this.document.visibilityState === 'visible' &&
          (state.query.projectId === event.projectId ||
            (!state.query.projectId && state.groupProjectIds.includes(event.projectId))),
      ),
      throttleTime(10_000, asyncScheduler, { leading: true, trailing: true }),
      filter(() => this.document.visibilityState === 'visible'),
      map(() => ActionsStore.refresh()),
    ),
  );

  reconnected$ = createEffect(() =>
    this.realtime.reconnected$.pipe(
      withLatestFrom(this.store.select(Selectors.getState)),
      filter(([, state]) => state.active && this.document.visibilityState === 'visible'),
      map(() => ActionsStore.refresh()),
    ),
  );

  groups$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          ActionsStore.enter,
          ActionsStore.load,
          ActionsStore.loadProjectsSuccess,
          ActionsStore.leave,
          AuthStoreActions.logoutCompleted,
        ),
        withLatestFrom(this.store.select(Selectors.getState)),
        tap(([, state]) => {
          const wanted = new Set(
            state.active
              ? state.query.projectId
                ? [state.query.projectId]
                : state.groupProjectIds
              : [],
          );
          for (const id of this.joinedProjects) {
            if (!wanted.has(id)) {
              this.joinedProjects.delete(id);
              void this.realtime.leaveProject(id).catch(() => undefined);
            }
          }
          for (const id of wanted) {
            if (!this.joinedProjects.has(id)) {
              this.joinedProjects.add(id);
              void this.realtime.joinProject(id).catch(() => undefined);
            }
          }
        }),
      ),
    { dispatch: false },
  );
}
