import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { projectRoleIds } from '../../../../../core/constants/project-role-ids.constants';
import { OrganizationModel } from '../../../../../core/models/organizations/organization.model';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { OrganizationsService } from '../../../../../core/services/organizations.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
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
  const organization: OrganizationModel = {
    id: 'org-id',
    title: 'Apple',
    voen: '8056783562',
    logoPath: null,
    createdAt: '2026-07-24T21:33:00Z',
    users: [{ id: 'client-1', name: 'Diana', surname: 'Zeynalova', email: 'diana@client.com' }],
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

  let getOrganization: ReturnType<typeof vi.fn>;
  let service: ParticipantDialogDataService;

  beforeEach(() => {
    getOrganization = vi.fn().mockReturnValue(of(organization));
    TestBed.configureTestingModule({
      providers: [
        ParticipantDialogDataService,
        { provide: DictionaryService, useValue: { getProjectRoleDictionaries: () => of(roles) } },
        { provide: WorkProjectsService, useValue: { getTeamMembers: () => of([teamMember]) } },
        { provide: OrganizationsService, useValue: { getOrganization } },
      ],
    });
    service = TestBed.inject(ParticipantDialogDataService);
  });

  const load = (kind: 'External' | 'Internal'): Promise<ParticipantDialogData> =>
    new Promise((resolve) => service.load(project(kind), kind === 'Internal').subscribe(resolve));

  it('marks team members and the organization clients with their side', async () => {
    const data = await load('External');

    expect(data.roles).toEqual(roles);
    expect(data.teamMembers).toEqual([{ ...teamMember, side: 'team' }]);
    expect(data.clientUsers).toEqual([
      { ...organization.users[0], avatarPath: null, side: 'client' },
    ]);
    expect(getOrganization).toHaveBeenCalledWith('org-id');
  });

  it('does not ask for an organization in an internal project', async () => {
    const data = await load('Internal');

    expect(data.clientUsers).toEqual([]);
    expect(getOrganization).not.toHaveBeenCalled();
  });
});
