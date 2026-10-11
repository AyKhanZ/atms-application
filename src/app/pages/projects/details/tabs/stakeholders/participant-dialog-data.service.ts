import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import {
  WorkProjectModel,
  WorkProjectParticipantCandidateModel,
  WorkProjectRoleModel,
} from '../../../../../core/models/work-projects';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
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
  private readonly projects = inject(WorkProjectsService);
  private readonly snackBar = inject(SnackBarService);
  private readonly transloco = inject(TranslocoService);

  load(
    project: WorkProjectModel,
    isInternal: boolean,
    includeTeamMembers: boolean,
  ): Observable<ParticipantDialogData> {
    const hasOrganization = !isInternal && !!project.organization?.id;

    return forkJoin({
      roles: this.keepWhatLoaded(this.dictionaries.getProjectRoleDictionaries(), []),
      teamMembers: includeTeamMembers
        ? this.keepWhatLoaded(this.projects.getTeamMembers(), [])
        : of([]),
      clientUsers: hasOrganization
        ? this.keepWhatLoaded(this.projects.getClientCandidates(project.id), [])
        : of([]),
    }).pipe(
      map(({ roles, teamMembers, clientUsers }) => ({
        roles,
        teamMembers: teamMembers.map((user) => toParticipantCandidate(user, 'team')),
        clientUsers: clientUsers.map((user) => toParticipantCandidate(user, 'client')),
      })),
    );
  }

  // one 403 used to cancel the whole dialog; show the lists that arrived and say the rest failed
  private keepWhatLoaded<T>(source: Observable<T>, fallback: T): Observable<T> {
    return source.pipe(
      catchError(() => {
        this.snackBar.error(this.transloco.translate('participants.loadFailed'));
        return of(fallback);
      }),
    );
  }
}

function toParticipantCandidate(
  user: WorkProjectParticipantCandidateModel,
  side: ParticipantSide,
): ParticipantCandidate {
  return {
    id: user.id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    avatarPath: user.avatarPath ?? null,
    side,
  };
}
