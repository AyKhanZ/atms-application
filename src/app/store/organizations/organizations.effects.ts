import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import * as OrganizationsStoreActions from './organizations.actions';
import { OrganizationsService } from '../../core/services/organizations.service';
import { SnackBarService } from '../../core/services/snack-bar.service';

@Injectable()
export class OrganizationsEffects {
  private readonly actions$ = inject(Actions);
  private readonly organizationsService = inject(OrganizationsService);
  private readonly snackBar = inject(SnackBarService);

  loadOrganizations$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsStoreActions.loadOrganizations),
      switchMap(({ filter }) =>
        this.organizationsService.getOrganizations(filter).pipe(
          map((response) => OrganizationsStoreActions.loadOrganizationsSuccess({ response })),
          catchError((err) => {
            console.error('[organizations] Failed to load organizations', err);
            return of(OrganizationsStoreActions.loadOrganizationsFailure());
          }),
        ),
      ),
    ),
  );

  loadOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsStoreActions.loadOrganization),
      switchMap(({ id }) =>
        this.organizationsService.getOrganization(id).pipe(
          map((item) => OrganizationsStoreActions.loadOrganizationSuccess({ item })),
          catchError((err) => {
            console.error('[organizations] Failed to load organization', err);
            return of(OrganizationsStoreActions.loadOrganizationFailure());
          }),
        ),
      ),
    ),
  );

  createOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsStoreActions.createOrganization),
      switchMap(({ command }) =>
        this.organizationsService.createOrganization(command).pipe(
          map((id) => OrganizationsStoreActions.createOrganizationSuccess({ id })),
          catchError((err) => {
            console.error('[organizations] Failed to create organization', err);
            return of(OrganizationsStoreActions.createOrganizationFailure());
          }),
        ),
      ),
    ),
  );


  updateOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsStoreActions.updateOrganization),
      switchMap(({ command }) =>
        this.organizationsService.updateOrganization(command).pipe(
          map(() => OrganizationsStoreActions.updateOrganizationSuccess()),
          catchError((err) => {
            console.error('[organizations] Failed to update organization', err);
            return of(OrganizationsStoreActions.updateOrganizationFailure());
          }),
        ),
      ),
    ),
  );

  deleteOrganization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OrganizationsStoreActions.deleteOrganization),
      switchMap(({ id }) =>
        this.organizationsService.deleteOrganization(id).pipe(
          map(() => OrganizationsStoreActions.deleteOrganizationSuccess({ id })),
          catchError((err) => {
            console.error('[organizations] Failed to delete organization', err);
            return of(OrganizationsStoreActions.deleteOrganizationFailure());
          }),
        ),
      ),
    ),
  );

  updateOrganizationSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OrganizationsStoreActions.updateOrganizationSuccess),
        tap(() => this.snackBar.success('Organization successfully updated.')),
      ),
    { dispatch: false },
  );

  updateOrganizationFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OrganizationsStoreActions.updateOrganizationFailure),
        tap(() => this.snackBar.error('Failed to update organization.')),
      ),
    { dispatch: false },
  );

  deleteOrganizationSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OrganizationsStoreActions.deleteOrganizationSuccess),
        tap(() => this.snackBar.success('Organization successfully deleted.')),
      ),
    { dispatch: false },
  );

  deleteOrganizationFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OrganizationsStoreActions.deleteOrganizationFailure),
        tap(() => this.snackBar.error('Failed to delete organization.')),
      ),
    { dispatch: false },
  );
  createOrganizationSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OrganizationsStoreActions.createOrganizationSuccess),
        tap(() => this.snackBar.success('Organization successfully created.')),
      ),
    { dispatch: false },
  );

  createOrganizationFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(OrganizationsStoreActions.createOrganizationFailure),
        tap(() => this.snackBar.error('Failed to create organization.')),
      ),
    { dispatch: false },
  );
}