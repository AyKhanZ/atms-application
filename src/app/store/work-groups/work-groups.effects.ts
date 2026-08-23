import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatLatestFrom } from '@ngrx/operators';
import { Store } from '@ngrx/store';
import { catchError, exhaustMap, filter, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { WorkGroupKind } from '../../core/models/work-groups';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { WorkGroupsService } from '../../core/services/work-groups.service';
import * as WorkGroupsStoreSelectors from './work-groups.selectors';
import * as WorkGroupsStoreActions from './work-groups.actions';

@Injectable()
export class WorkGroupsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(WorkGroupsService);
  private readonly snackBar = inject(SnackBarService);
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
                error: "We couldn't refresh the plan. The information shown may be out of date.",
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
                error: createErrorMessage(error, kind),
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
                error: updateErrorMessage(error, kind),
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
                error: deleteErrorMessage(error, kind),
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
          const itemName = action.kind === 'group' ? 'Group' : 'Milestone';
          const message = action.type.includes('Create')
            ? `${itemName} created.`
            : action.type.includes('Update')
              ? `${itemName} changes saved.`
              : `${itemName} deleted.`;

          this.snackBar.success(message);
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

function createErrorMessage(error: HttpErrorResponse, kind: WorkGroupKind): string {
  const validationMessage = getValidationMessage(error);
  if (validationMessage) return validationMessage;
  if (error.status === 409) return duplicateNameMessage(kind);
  if (error.status === 404) {
    return kind === 'milestone'
      ? 'The selected group is no longer available. Refresh the plan and try again.'
      : 'This project is no longer available. Return to Projects and open it again.';
  }

  return `We couldn't create the ${kind}. Please try again.`;
}

function updateErrorMessage(error: HttpErrorResponse, kind: WorkGroupKind): string {
  const validationMessage = getValidationMessage(error);
  if (validationMessage) return validationMessage;
  if (error.status === 409) return duplicateNameMessage(kind);
  if (error.status === 404) return unavailableItemMessage(kind);

  return `We couldn't save changes to the ${kind}. Please try again.`;
}

function deleteErrorMessage(error: HttpErrorResponse, kind: WorkGroupKind): string {
  if (error.status === 409) {
    return kind === 'group'
      ? 'This group still contains milestones or tickets. Remove them before deleting the group.'
      : 'This milestone still contains tickets. Remove them before deleting the milestone.';
  }
  if (error.status === 404) return unavailableItemMessage(kind);

  return `We couldn't delete the ${kind}. Please try again.`;
}

function duplicateNameMessage(kind: WorkGroupKind): string {
  return kind === 'group'
    ? 'A group with this name already exists. Choose a different name.'
    : 'This group already has a milestone with this name. Choose a different name.';
}

function unavailableItemMessage(kind: WorkGroupKind): string {
  const itemName = kind === 'group' ? 'group' : 'milestone';

  return `This ${itemName} is no longer available. Refresh the plan and try again.`;
}

function getValidationMessage(error: HttpErrorResponse): string | null {
  if (error.status !== 400) return null;

  const errors = error.error?.errors as { field?: string; error?: string }[] | undefined;
  const titleError = errors?.find((item) => item.field?.toLowerCase() === 'title')?.error;

  return titleError ?? errors?.find((item) => item.error)?.error ?? null;
}
