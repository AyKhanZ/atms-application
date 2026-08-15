import { WorkProjectRoleModel } from './work-project-role.model';

export interface WorkProjectParticipantModel {
  userId: string;
  name: string;
  surname: string;
  email: string;
  role: WorkProjectRoleModel;
}
