import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import * as WorkProjectsStoreActions from './work-projects.actions';

@Injectable()
export class WorkProjectsEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(WorkProjectsService);
  private readonly snackBar = inject(SnackBarService);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.loadProjects),
      switchMap(({ filter }) =>
        this.service.getProjects(filter).pipe(
          map((response) => WorkProjectsStoreActions.loadProjectsSuccess({ response })),
          catchError(() => of(WorkProjectsStoreActions.loadProjectsFailure())),
        ),
      ),
    ),
  );
  loadOne$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.loadProject),
      switchMap(({ id }) =>
        this.service.getProject(id).pipe(
          map((item) => WorkProjectsStoreActions.loadProjectSuccess({ item })),
          catchError(() => of(WorkProjectsStoreActions.loadProjectFailure())),
        ),
      ),
    ),
  );
  create$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.createProject),
      switchMap(({ command }) =>
        this.service.createProject(command).pipe(
          map((id) => WorkProjectsStoreActions.createProjectSuccess({ id })),
          catchError(() => of(WorkProjectsStoreActions.createProjectFailure())),
        ),
      ),
    ),
  );
  update$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.updateProject),
      switchMap(({ command }) =>
        this.service.updateProject(command).pipe(
          map(() => WorkProjectsStoreActions.updateProjectSuccess()),
          catchError(() => of(WorkProjectsStoreActions.updateProjectFailure())),
        ),
      ),
    ),
  );
  updateStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.updateProjectStatus),
      switchMap(({ id, projectStatusId }) =>
        this.service.updateStatus(id, projectStatusId).pipe(
          map(() => WorkProjectsStoreActions.updateProjectStatusSuccess({ id, projectStatusId })),
          catchError(() => of(WorkProjectsStoreActions.updateProjectStatusFailure())),
        ),
      ),
    ),
  );
  addParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.addProjectParticipant),
      switchMap(({ id, userId, roleId }) =>
        this.service.addParticipant(id, userId, roleId).pipe(
          map(() => WorkProjectsStoreActions.addProjectParticipantSuccess()),
          catchError(() => of(WorkProjectsStoreActions.addProjectParticipantFailure())),
        ),
      ),
    ),
  );
  updateParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.updateProjectParticipant),
      switchMap(({ id, participantId, roleId }) =>
        this.service.updateParticipant(id, participantId, roleId).pipe(
          map(() => WorkProjectsStoreActions.updateProjectParticipantSuccess()),
          catchError(() => of(WorkProjectsStoreActions.updateProjectParticipantFailure())),
        ),
      ),
    ),
  );
  deleteParticipant$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.deleteProjectParticipant),
      switchMap(({ id, participantId }) =>
        this.service.deleteParticipant(id, participantId).pipe(
          map(() => WorkProjectsStoreActions.deleteProjectParticipantSuccess()),
          catchError(() => of(WorkProjectsStoreActions.deleteProjectParticipantFailure())),
        ),
      ),
    ),
  );
  delete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkProjectsStoreActions.deleteProject),
      switchMap(({ id }) =>
        this.service.deleteProject(id).pipe(
          map(() => WorkProjectsStoreActions.deleteProjectSuccess({ id })),
          catchError(() => of(WorkProjectsStoreActions.deleteProjectFailure())),
        ),
      ),
    ),
  );

  successes$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          WorkProjectsStoreActions.createProjectSuccess,
          WorkProjectsStoreActions.updateProjectSuccess,
          WorkProjectsStoreActions.updateProjectStatusSuccess,
          WorkProjectsStoreActions.addProjectParticipantSuccess,
          WorkProjectsStoreActions.updateProjectParticipantSuccess,
          WorkProjectsStoreActions.deleteProjectParticipantSuccess,
          WorkProjectsStoreActions.deleteProjectSuccess,
        ),
        tap((action) =>
          this.snackBar.success(
            action.type.includes('Participant')
              ? 'Participants successfully updated.'
              : action.type.includes('Delete')
              ? 'Project successfully deleted.'
              : action.type.includes('Create')
                ? 'Project successfully created.'
                : 'Project successfully updated.',
          ),
        ),
      ),
    { dispatch: false },
  );

  failures$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          WorkProjectsStoreActions.createProjectFailure,
          WorkProjectsStoreActions.updateProjectFailure,
          WorkProjectsStoreActions.updateProjectStatusFailure,
          WorkProjectsStoreActions.addProjectParticipantFailure,
          WorkProjectsStoreActions.updateProjectParticipantFailure,
          WorkProjectsStoreActions.deleteProjectParticipantFailure,
          WorkProjectsStoreActions.deleteProjectFailure,
        ),
        tap(() => this.snackBar.error('The project could not be saved. Please try again.')),
      ),
    { dispatch: false },
  );
}
