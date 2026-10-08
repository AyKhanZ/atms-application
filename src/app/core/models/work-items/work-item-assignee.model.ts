export interface WorkItemAssigneeModel {
  // participant id, not user id
  id: string;
  name: string;
  surname: string;
  avatarPath?: string | null;
}
