import { AuditUserModel } from './audit-user.model';

export interface PersonModel extends AuditUserModel {
  avatarPath?: string | null;
}
