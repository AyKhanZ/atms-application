import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { ReplaySubject, throwError } from 'rxjs';
import { translocoTestingProviders } from '../../core/testing/transloco-testing';
import { OrganizationsService } from '../../core/services/organizations.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { OrganizationsEffects } from './organizations.effects';
import * as OrganizationsStoreActions from './organizations.actions';

describe('OrganizationsEffects', () => {
  let actions$: ReplaySubject<unknown>;
  let snackBarError: ReturnType<typeof vi.fn>;
  let createOrganization: ReturnType<typeof vi.fn>;

  const command = { title: 'Yelo Bank', voen: '1902233441', logo: null };

  const voenTaken = new HttpErrorResponse({
    status: 400,
    error: {
      message: 'Validation failed',
      errors: [{ field: 'Voen', error: 'This tax ID is already used by another organization.' }],
    },
  });

  beforeEach(() => {
    actions$ = new ReplaySubject<unknown>(1);
    snackBarError = vi.fn();
    createOrganization = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        OrganizationsEffects,
        provideMockActions(() => actions$),
        { provide: OrganizationsService, useValue: { createOrganization } },
        { provide: SnackBarService, useValue: { success: vi.fn(), error: snackBarError } },
      ],
    });
  });

  it('passes the server validation message and its field to the failure', () => {
    createOrganization.mockReturnValue(throwError(() => voenTaken));
    const emitted = vi.fn();
    TestBed.inject(OrganizationsEffects).createOrganization$.subscribe(emitted);

    actions$.next(OrganizationsStoreActions.createOrganization({ command }));

    expect(emitted).toHaveBeenCalledWith(
      OrganizationsStoreActions.createOrganizationFailure({
        error: { status: 400, message: 'This tax ID is already used by another organization.' },
        field: 'Voen',
      }),
    );
  });

  it('shows no generic toast when the server explained the error', () => {
    TestBed.inject(OrganizationsEffects).createOrganizationFailure$.subscribe();

    actions$.next(
      OrganizationsStoreActions.createOrganizationFailure({
        error: { status: 400, message: 'This tax ID is already used by another organization.' },
        field: 'Voen',
      }),
    );

    expect(snackBarError).not.toHaveBeenCalled();
  });

  it('shows the generic toast when the server sent no message', () => {
    TestBed.inject(OrganizationsEffects).createOrganizationFailure$.subscribe();

    actions$.next(
      OrganizationsStoreActions.createOrganizationFailure({
        error: { status: 500, message: null },
        field: null,
      }),
    );

    expect(snackBarError).toHaveBeenCalledTimes(1);
  });

  it('shows no generic toast on update when the server explained the error', () => {
    TestBed.inject(OrganizationsEffects).updateOrganizationFailure$.subscribe();

    actions$.next(
      OrganizationsStoreActions.updateOrganizationFailure({
        error: { status: 400, message: 'An organization with this name already exists.' },
        field: 'Title',
      }),
    );

    expect(snackBarError).not.toHaveBeenCalled();
  });
});
