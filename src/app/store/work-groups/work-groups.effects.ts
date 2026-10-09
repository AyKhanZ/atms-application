import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, exhaustMap, filter, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { WorkGroupKind } from '../../core/models/work-groups';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { WorkGroupsService } from '../../core/services/work-groups.service';
import * as WorkGroupsStoreSelectors from './work-groups.selectors';
import * as WorkGroupsStoreActions from './work-groups.actions';
import { validationMessage } from '../../core/utils/http-error.utils';

@Injectable()
export class WorkGroupsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(WorkGroupsService);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);
  private readonly reset$ = this.actions$.pipe(ofType(WorkGroupsStoreActions.resetWorkGroups));

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkGroupsStoreActions.loadWorkGroups),
      switchMap(({ projectId }) =>
        this.service.getWorkGroups(projectId).pipe(
          map((items) => WorkGroupsStoreActions.loadWorkGroupsSuccess({ projectId, items })),
          catchError(() =>
            of(
              WorkGroupsStoreActions.loadWorkGroupsFailure({
                projectId,
                error: this.transloco.translate('plan.refreshFailed'),
              }),
            ),
          ),
          takeUntil(this.reset$),
        ),
      ),
    ),
  );

  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkGroupsStoreActions.createWorkGroup),
      exhaustMap(({ projectId, kind, command }) =>
        this.service.createWorkGroup(projectId, command).pipe(
          map((id) =>
            WorkGroupsStoreActions.createWorkGroupSuccess({
              projectId,
              id,
              kind,
              parentWorkGroupId: command.parentWorkGroupId ?? null,
            }),
          ),
          catchError((error: HttpErrorResponse) =>
            of(
              WorkGroupsStoreActions.createWorkGroupFailure({
                projectId,
                kind,
                error: createErrorMessage(error, kind, (key, params) =>
                  this.transloco.translate(key, params),
                ),
              }),
            ),
          ),
          takeUntil(this.reset$),
        ),
      ),
    ),
  );

  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkGroupsStoreActions.updateWorkGroup),
      exhaustMap(({ projectId, workGroupId, kind, command }) =>
        this.service.updateWorkGroup(projectId, workGroupId, command).pipe(
          map(() =>
            WorkGroupsStoreActions.updateWorkGroupSuccess({ projectId, workGroupId, kind }),
          ),
          catchError((error: HttpErrorResponse) =>
            of(
              WorkGroupsStoreActions.updateWorkGroupFailure({
                projectId,
                kind,
                error: updateErrorMessage(error, kind, (key, params) =>
                  this.transloco.translate(key, params),
                ),
              }),
            ),
          ),
          takeUntil(this.reset$),
        ),
      ),
    ),
  );

  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkGroupsStoreActions.deleteWorkGroup),
      exhaustMap(({ projectId, workGroupId, kind }) =>
        this.service.deleteWorkGroup(projectId, workGroupId).pipe(
          map(() =>
            WorkGroupsStoreActions.deleteWorkGroupSuccess({ projectId, workGroupId, kind }),
          ),
          catchError((error: HttpErrorResponse) =>
            of(
              WorkGroupsStoreActions.deleteWorkGroupFailure({
                projectId,
                kind,
                error: deleteErrorMessage(error, kind, (key, params) =>
                  this.transloco.translate(key, params),
                ),
              }),
            ),
          ),
          takeUntil(this.reset$),
        ),
      ),
    ),
  );

  reloadAfterMutation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        WorkGroupsStoreActions.createWorkGroupSuccess,
        WorkGroupsStoreActions.updateWorkGroupSuccess,
        WorkGroupsStoreActions.deleteWorkGroupSuccess,
      ),
      concatLatestFrom(() => this.store.select(WorkGroupsStoreSelectors.getProjectId)),
      filter(([action, activeProjectId]) => action.projectId === activeProjectId),
      map(([action]) => WorkGroupsStoreActions.loadWorkGroups({ projectId: action.projectId })),
    ),
  );

  successMessages$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          WorkGroupsStoreActions.createWorkGroupSuccess,
          WorkGroupsStoreActions.updateWorkGroupSuccess,
          WorkGroupsStoreActions.deleteWorkGroupSuccess,
        ),
        tap((action) => {
          const key =
            action.kind === 'group'
              ? action.type.includes('Create')
                ? 'plan.groupCreated'
                : action.type.includes('Update')
                  ? 'plan.groupSaved'
                  : 'plan.groupDeleted'
              : action.type.includes('Create')
                ? 'plan.milestoneCreated'
                : action.type.includes('Update')
                  ? 'plan.milestoneSaved'
                  : 'plan.milestoneDeleted';

          this.snackBar.success(this.transloco.translate(key));
        }),
      ),
    { dispatch: false },
  );

  failureMessages$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          WorkGroupsStoreActions.createWorkGroupFailure,
          WorkGroupsStoreActions.updateWorkGroupFailure,
          WorkGroupsStoreActions.deleteWorkGroupFailure,
        ),
        tap(({ error }) => this.snackBar.error(error)),
      ),
    { dispatch: false },
  );
}

function createErrorMessage(
  error: HttpErrorResponse,
  kind: WorkGroupKind,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  const invalid = validationMessage(error, 'title');
  if (invalid) return invalid;
  if (error.status === 409) return duplicateNameMessage(kind, translate);
  if (error.status === 404) {
    return translate(kind === 'milestone' ? 'plan.groupMissing' : 'plan.projectMissing');
  }

  return translate(kind === 'group' ? 'plan.createGroupFailed' : 'plan.createMilestoneFailed');
}

function updateErrorMessage(
  error: HttpErrorResponse,
  kind: WorkGroupKind,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  const invalid = validationMessage(error, 'title');
  if (invalid) return invalid;
  if (error.status === 409) return duplicateNameMessage(kind, translate);
  if (error.status === 404) return unavailableItemMessage(kind, translate);

  return translate(kind === 'group' ? 'plan.saveGroupFailed' : 'plan.saveMilestoneFailed');
}

function deleteErrorMessage(
  error: HttpErrorResponse,
  kind: WorkGroupKind,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  if (error.status === 409) {
    return translate(kind === 'group' ? 'plan.groupStillHas' : 'plan.milestoneStillHas');
  }
  if (error.status === 404) return unavailableItemMessage(kind, translate);

  return translate(kind === 'group' ? 'plan.deleteGroupFailed' : 'plan.deleteMilestoneFailed');
}

function duplicateNameMessage(
  kind: WorkGroupKind,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  return translate(kind === 'group' ? 'plan.duplicateGroup' : 'plan.duplicateMilestone');
}

function unavailableItemMessage(
  kind: WorkGroupKind,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  return translate(kind === 'group' ? 'plan.groupUnavailable' : 'plan.milestoneUnavailable');
}
