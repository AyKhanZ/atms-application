import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { projectRoleIds } from '../../../../../core/constants/project-role-ids.constants';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { translocoTestingProviders } from '../../../../../core/testing/transloco-testing';
import { ParticipantDialogData, ParticipantDialogDataService } from './participant-dialog-data.service';

describe('ParticipantDialogDataService', () => {
  const roles = [{ id: projectRoleIds.developer, name: 'Developer', code: 'developer' }];
  const teamMember = {
    id: 'team-1',
    name: 'Rustam',
    surname: 'Aliyev',
    email: 'rustam@baim.az',
    avatarPath: '/avatars/rustam.png',
  };
  const client = {
    id: 'client-1',
    name: 'Diana',
    surname: 'Zeynalova',
    email: 'diana@client.com',
    avatarPath: '/avatars/diana.png',
  };

  const project = (kind: 'External' | 'Internal'): WorkProjectModel => ({
    id: 'project-id',
    code: '7',
    title: 'Portal',
    projectType: { id: 1, name: 'Standard', code: 'Standard' },
    projectKind: { id: 2, name: kind, code: kind },
    projectStatus: { id: 1, name: 'Draft', code: 'Draft' },
    organization: kind === 'External' ? { id: 'org-id', title: 'Apple', logoPath: null } : null,
    participants: [],
    invitations: [],
    createdAt: '2026-10-01T10:00:00Z',
  });

  let getTeamMembers: ReturnType<typeof vi.fn>;
  let getClientCandidates: ReturnType<typeof vi.fn>;
  let snackBarError: ReturnType<typeof vi.fn>;
  let service: ParticipantDialogDataService;

  beforeEach(() => {
    getTeamMembers = vi.fn().mockReturnValue(of([teamMember]));
    getClientCandidates = vi.fn().mockReturnValue(of([client]));
    snackBarError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ...translocoTestingProviders(),
        ParticipantDialogDataService,
        { provide: DictionaryService, useValue: { getProjectRoleDictionaries: () => of(roles) } },
        {
          provide: WorkProjectsService,
          useValue: { getTeamMembers, getClientCandidates },
        },
        { provide: SnackBarService, useValue: { error: snackBarError } },
      ],
    });
    service = TestBed.inject(ParticipantDialogDataService);
  });

  const load = (
    kind: 'External' | 'Internal',
    includeTeamMembers: boolean,
  ): Promise<ParticipantDialogData> =>
    new Promise((resolve) =>
      service.load(project(kind), kind === 'Internal', includeTeamMembers).subscribe(resolve),
    );

  it('marks team members and the organization clients with their side', async () => {
    const data = await load('External', true);

    expect(data.roles).toEqual(roles);
    expect(data.teamMembers).toEqual([{ ...teamMember, side: 'team' }]);
    expect(data.clientUsers).toEqual([{ ...client, side: 'client' }]);
    expect(getTeamMembers).toHaveBeenCalled();
    expect(getClientCandidates).toHaveBeenCalledWith('project-id');
  });

  it('does not ask for clients in an internal project', async () => {
    const data = await load('Internal', true);

    expect(data.clientUsers).toEqual([]);
    expect(getClientCandidates).not.toHaveBeenCalled();
  });

  it('does not ask for BAIM employees when the user cannot invite them', async () => {
    const data = await load('External', false);

    expect(data.teamMembers).toEqual([]);
    expect(data.clientUsers).toEqual([{ ...client, side: 'client' }]);
    expect(getTeamMembers).not.toHaveBeenCalled();
    expect(getClientCandidates).toHaveBeenCalledWith('project-id');
  });

  it('keeps the lists that loaded when one request fails', async () => {
    getClientCandidates.mockReturnValue(throwError(() => new Error('forbidden')));

    const data = await load('External', true);

    expect(data.roles).toEqual(roles);
    expect(data.teamMembers).toEqual([{ ...teamMember, side: 'team' }]);
    expect(data.clientUsers).toEqual([]);
    expect(snackBarError).toHaveBeenCalledWith(
      'Participants could not be loaded. Please try again.',
    );
  });
});
