import { WorkProjectRoleModel } from './work-project-role.model';

export interface WorkProjectParticipantModel {
  id: string;
  userId: string;
  name: string;
  surname: string;
  email: string;
  avatarPath?: string | null;
  category: 'admin' | 'client' | 'staff';
  role: WorkProjectRoleModel;
}
