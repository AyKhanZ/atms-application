import { AuditUserModel } from '../audit-user.model';

export interface HistoryPersonModel extends AuditUserModel {
  avatarPath?: string | null;
}
