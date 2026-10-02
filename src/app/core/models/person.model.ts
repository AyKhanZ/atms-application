import { AuditUserModel } from './audit-user.model';

/** A person shown beside what they did — in history, comments, mentions and the dashboard. */
export interface PersonModel extends AuditUserModel {
  avatarPath?: string | null;
}
