export interface WorkItemAssigneeModel {
  /** The project participant. */
  id: string;
  name: string;
  surname: string;
  avatarPath?: string | null;
}
