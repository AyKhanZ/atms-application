import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of } from 'rxjs';
import {
  OrganizationModel,
  OrganizationUserModel,
} from '../../../../../core/models/organizations/organization.model';
import {
  WorkProjectModel,
  WorkProjectParticipantCandidateModel,
  WorkProjectRoleModel,
} from '../../../../../core/models/work-projects';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { OrganizationsService } from '../../../../../core/services/organizations.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { ParticipantCandidate, ParticipantSide } from './participant-candidate.model';

export interface ParticipantDialogData {
  roles: WorkProjectRoleModel[];
  teamMembers: ParticipantCandidate[];
  clientUsers: ParticipantCandidate[];
}

@Injectable()
export class ParticipantDialogDataService {
  private readonly dictionaries = inject(DictionaryService);
  private readonly organizations = inject(OrganizationsService);
  private readonly projects = inject(WorkProjectsService);

  load(project: WorkProjectModel, isInternal: boolean): Observable<ParticipantDialogData> {
    return forkJoin({
      roles: this.dictionaries.getProjectRoleDictionaries(),
      teamMembers: this.projects.getTeamMembers(),
      organization:
        !isInternal && project.organization?.id
          ? this.organizations.getOrganization(project.organization.id)
          : of(null as OrganizationModel | null),
    }).pipe(
      map(({ roles, teamMembers, organization }) => ({
        roles,
        teamMembers: teamMembers.map((user) => toParticipantCandidate(user, 'team')),
        clientUsers: (organization?.users ?? []).map((user) =>
          toParticipantCandidate(user, 'client'),
        ),
      })),
    );
  }
}

function toParticipantCandidate(
  user: WorkProjectParticipantCandidateModel | OrganizationUserModel,
  side: ParticipantSide,
): ParticipantCandidate {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    avatarPath: 'avatarPath' in user ? user.avatarPath : null,
    side,
  };
}
