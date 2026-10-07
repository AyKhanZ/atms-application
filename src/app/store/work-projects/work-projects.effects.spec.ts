import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { of, Subject, throwError } from 'rxjs';
import { ProjectAccessService } from '../../core/services/project-access.service';
import { SnackBarService } from '../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import * as Actions from './work-projects.actions';
import { WorkProjectsEffects } from './work-projects.effects';

describe('WorkProjectsEffects — invitations', () => {
  const command = { email: ' anna@client.com ', name: 'Anna', surname: 'Smith' };
  let actions: Subject<Action>;
  let emitted: Action[];
  let effects: WorkProjectsEffects;
  let service: {
    inviteParticipant: ReturnType<typeof vi.fn>;
    cancelInvitation: ReturnType<typeof vi.fn>;
  };
  let snackBar: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    actions = new Subject<Action>();
    emitted = [];
    service = { inviteParticipant: vi.fn(), cancelInvitation: vi.fn() };
    snackBar = { success: vi.fn(), error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        WorkProjectsEffects,
        provideMockActions(() => actions),
        { provide: WorkProjectsService, useValue: service },
        { provide: SnackBarService, useValue: snackBar },
        { provide: ProjectAccessService, useValue: { clear: vi.fn() } },
      ],
    });
    effects = TestBed.inject(WorkProjectsEffects);
  });

  it('sends the invitation and answers with the trimmed email', () => {
    service.inviteParticipant.mockReturnValue(of(undefined));
    effects.inviteParticipant$.subscribe((action) => emitted.push(action));

    actions.next(Actions.inviteProjectParticipant({ id: 'project-id', command }));

    expect(service.inviteParticipant).toHaveBeenCalledWith('project-id', command);
    expect(emitted).toEqual([
      Actions.inviteProjectParticipantSuccess({ id: 'project-id', email: 'anna@client.com' }),
    ]);
  });

  it('carries the server validation message to the dialog', () => {
    service.inviteParticipant.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              errors: [{ field: 'Email', error: 'A user with this email already exists.' }],
            },
          }),
      ),
    );
    effects.inviteParticipant$.subscribe((action) => emitted.push(action));

    actions.next(Actions.inviteProjectParticipant({ id: 'project-id', command }));

    expect(emitted).toEqual([
      Actions.inviteProjectParticipantFailure({
        error: { status: 400, message: 'A user with this email already exists.' },
        field: 'Email',
      }),
    ]);
  });

  it('cancels an invitation and reports a refusal with the server text', () => {
    service.cancelInvitation.mockReturnValueOnce(of(undefined)).mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { errors: [{ field: 'InvitationId', error: 'Already joined.' }] },
          }),
      ),
    );
    effects.cancelInvitation$.subscribe((action) => emitted.push(action));
    effects.invitationNotCancelled$.subscribe();

    actions.next(Actions.cancelProjectInvitation({ id: 'project-id', invitationId: 'i1' }));
    actions.next(Actions.cancelProjectInvitation({ id: 'project-id', invitationId: 'i2' }));

    expect(emitted).toEqual([
      Actions.cancelProjectInvitationSuccess({ id: 'project-id' }),
      Actions.cancelProjectInvitationFailure({ id: 'project-id', message: 'Already joined.' }),
    ]);

    // The mock action stream does not loop effects back; feed the failure in to check the toast.
    actions.next(emitted[1]);
    expect(snackBar.error).toHaveBeenCalledWith('Already joined.');
  });

  it('says whom the invitation went to', () => {
    effects.inviteSucceeded$.subscribe();

    actions.next(
      Actions.inviteProjectParticipantSuccess({ id: 'project-id', email: 'anna@client.com' }),
    );

    expect(snackBar.success).toHaveBeenCalledWith('Invitation sent to anna@client.com');
  });

  it('toasts only a refusal the dialog cannot show under the email', () => {
    effects.inviteFailed$.subscribe();

    actions.next(
      Actions.inviteProjectParticipantFailure({
        error: { status: 400, message: 'Taken.' },
        field: 'Email',
      }),
    );
    expect(snackBar.error).not.toHaveBeenCalled();

    actions.next(
      Actions.inviteProjectParticipantFailure({
        error: { status: 500, message: null },
        field: null,
      }),
    );
    expect(snackBar.error).toHaveBeenCalledWith(
      'The invitation could not be sent. Please try again.',
    );
  });
});
