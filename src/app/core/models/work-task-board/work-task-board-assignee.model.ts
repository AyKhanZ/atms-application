/** A person the "Assigned to" filter offers — one entry per person, across projects. */
export interface WorkTaskBoardAssigneeModel {
  id: string;
  name: string;
  surname: string;
  avatarPath?: string | null;
}
