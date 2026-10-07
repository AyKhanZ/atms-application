import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Action } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { of, Subject } from 'rxjs';
import { projectRoleIds } from '../../../../../core/constants/project-role-ids.constants';
import { ProjectPermissions } from '../../../../../core/enums/project-permissions.enum';
import {
  WorkProjectInvitationModel,
  WorkProjectModel,
  WorkProjectParticipantModel,
} from '../../../../../core/models/work-projects';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { OrganizationsService } from '../../../../../core/services/organizations.service';
import { ProjectAccessService } from '../../../../../core/services/project-access.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { WorkProjectsStoreActions } from '../../../../../store/work-projects';
import { StakeholdersTabComponent } from './stakeholders-tab.component';

describe('StakeholdersTabComponent', { timeout: 20_000 }, () => {
  let actions: Subject<Action>;
  let permissions: string[];
  let confirmation: ConfirmationService;
  let store: MockStore;

  const participant = (
    id: string,
    category: WorkProjectParticipantModel['category'],
    hasCompletedOnboarding = true,
  ): WorkProjectParticipantModel => ({
    id,
    userId: `user-${id}`,
    name: 'Diana',
    surname: id,
    email: `${id}@client.com`,
    category,
    hasCompletedOnboarding,
    role: {
      id:
        category === 'client' ? projectRoleIds.clientOrganizationViewer : projectRoleIds.developer,
      name: category === 'client' ? 'Client Viewer' : 'Developer',
      code: 'role',
    },
  });

  const invitation = (id: string): WorkProjectInvitationModel => ({
    id,
    name: 'Anna',
    surname: id,
    email: `${id}@client.com`,
    role: { id: projectRoleIds.clientOrganizationViewer, name: 'Client Viewer', code: 'role' },
    createdAt: '2026-10-07T10:00:00Z',
  });

  const project = (
    participants: WorkProjectParticipantModel[],
    invitations: WorkProjectInvitationModel[],
    organization = true,
  ): WorkProjectModel => ({
    id: 'project-id',
    code: '7',
    title: 'Portal',
    projectType: { id: 1, name: 'Standard', code: 'Standard' },
    projectKind: { id: 2, name: 'External', code: organization ? 'External' : 'Internal' },
    projectStatus: { id: 1, name: 'Draft', code: 'Draft' },
    organization: organization ? { id: 'org-id', title: 'Apple', logoPath: null } : null,
    participants,
    invitations,
    createdAt: '2026-10-01T10:00:00Z',
  });

  const render = (value: WorkProjectModel) => {
    const fixture = TestBed.createComponent(StakeholdersTabComponent);
    fixture.componentRef.setInput('project', value);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    actions = new Subject<Action>();
    permissions = [];
    await TestBed.configureTestingModule({
      imports: [StakeholdersTabComponent],
      providers: [
        provideRouter([]),
        provideMockStore(),
        provideMockActions(() => actions),
        ConfirmationService,
        { provide: ProjectAccessService, useValue: { getPermissions: () => of(permissions) } },
        { provide: DictionaryService, useValue: { getProjectRoleDictionaries: () => of([]) } },
        { provide: WorkProjectsService, useValue: { getTeamMembers: () => of([]) } },
        { provide: OrganizationsService, useValue: { getOrganization: () => of(null) } },
      ],
    }).compileComponents();
    confirmation = TestBed.inject(ConfirmationService);
    store = TestBed.inject(MockStore);
  });

  it('counts pending invitations toward the 20 places and disables Add when they are taken', () => {
    permissions = [ProjectPermissions.Participant.InviteClient];
    const participants = Array.from({ length: 18 }, (_, index) =>
      participant(`p${index}`, 'client'),
    );
    const fixture = render(project(participants, [invitation('i1'), invitation('i2')]));

    expect(fixture.componentInstance.participantsCount()).toBe(20);
    const add = (fixture.nativeElement as HTMLElement).querySelector(
      '.add-participant-button',
    ) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
  });

  it('shows Invited for pending invitations and for participants who have not finished onboarding', () => {
    const fixture = render(
      project(
        [participant('done', 'client'), participant('new', 'client', false)],
        [invitation('i1')],
      ),
    );

    const rows = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('.participants-row'),
    ].slice(1);
    const invited = rows.map((row) => !!row.querySelector('.invited-status'));
    expect(invited).toEqual([false, true, true]);
  });

  it.each([
    [[ProjectPermissions.Participant.InviteClient], true],
    [[], false],
  ])(
    'offers invitation by email only with the right to invite clients (%s)',
    (granted, expected) => {
      permissions = granted;
      const fixture = render(project([], []));

      expect(fixture.componentInstance.canInviteByEmail()).toBe(expected);
    },
  );

  it('offers no invitation by email in a project without an organization', () => {
    permissions = [ProjectPermissions.Participant.InviteClient];
    const fixture = render(project([], [], false));

    expect(fixture.componentInstance.canInviteByEmail()).toBe(false);
  });

  // The client manager removes clients only; the project manager removes anyone.
  it.each([
    [[ProjectPermissions.Participant.DeleteClient], ['client']],
    [[ProjectPermissions.Participant.Delete], ['client', 'staff']],
    [[], []],
  ])('lets %s remove %s', (granted, removable) => {
    permissions = granted;
    const fixture = render(
      project([participant('client', 'client'), participant('staff', 'staff')], []),
    );

    expect([...fixture.componentInstance.removableParticipantIds()]).toEqual(removable);
  });

  it('gives an invitation row only Cancel invitation, and only to those who may invite', () => {
    permissions = [ProjectPermissions.Participant.InviteClient];
    const fixture = render(project([], [invitation('i1')]));

    const menuButton = (fixture.nativeElement as HTMLElement).querySelector(
      '.participants-row:last-child .row-menu-button',
    );
    expect(menuButton?.getAttribute('aria-label')).toContain('i1@client.com');
    expect(fixture.componentInstance.invitationActions.map((action) => action.label)).toEqual([
      'Cancel invitation',
    ]);

    permissions = [];
    const withoutRight = render(project([], [invitation('i1')]));
    expect(
      (withoutRight.nativeElement as HTMLElement).querySelector(
        '.participants-row .row-menu-button',
      ),
    ).toBeNull();
  });

  it('cancels the invitation after confirmation', () => {
    permissions = [ProjectPermissions.Participant.InviteClient];
    const dispatch = vi.spyOn(store, 'dispatch');
    vi.spyOn(confirmation, 'confirm').mockImplementation((options) => {
      options.accept?.();
      return confirmation;
    });
    const fixture = render(project([], [invitation('i1')]));

    fixture.componentInstance.confirmCancelInvitation(invitation('i1'));

    expect(dispatch).toHaveBeenCalledWith(
      WorkProjectsStoreActions.cancelProjectInvitation({ id: 'project-id', invitationId: 'i1' }),
    );
  });

  it('puts a refusal under the field the server named', () => {
    const fixture = render(project([], []));

    actions.next(
      WorkProjectsStoreActions.inviteProjectParticipantFailure({
        error: { status: 400, message: 'Name must be less than 50 symbols.' },
        field: 'Name',
      }),
    );

    expect(fixture.componentInstance.inviteError()).toEqual({
      field: 'name',
      message: 'Name must be less than 50 symbols.',
    });
  });
});
