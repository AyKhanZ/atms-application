import { AuditUserModel } from '../audit-user.model';

export interface AttachmentAuthorModel extends AuditUserModel {
  avatarPath?: string | null;
}
