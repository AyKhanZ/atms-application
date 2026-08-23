import { projectRoleIds } from '../../../../../core/constants/project-role-ids.constants';
import { WorkProjectRoleModel } from '../../../../../core/models/work-projects';
import { ParticipantSide } from './participant-candidate.model';

export function availableParticipantRoles(
  roles: WorkProjectRoleModel[],
  side: ParticipantSide,
): WorkProjectRoleModel[] {
  const roleIds =
    side === 'client'
      ? [projectRoleIds.clientOrganizationManager, projectRoleIds.clientOrganizationViewer]
      : [projectRoleIds.projectManager, projectRoleIds.businessConsultant, projectRoleIds.developer];
  const allowed = new Set<string>(roleIds);

  return roles.filter((role) => allowed.has(role.id));
}
