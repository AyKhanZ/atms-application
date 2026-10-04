import { PersonModel } from '../person.model';
import { NotificationParametersModel } from './notification-parameters.model';

export interface NotificationModel {
  id: string;
  /** `NotificationType`. */
  type: number;
  createdAt: string;
  readAt: string | null;
  /** Who did it; `null` when the system did, as with deadline reminders. */
  actor: PersonModel | null;
  projectId: string;
  /** `NotificationEntityType`. */
  entityType: number;
  entityId: string;
  /** The ticket the task is in now; `null` for a project or a deleted task. */
  workTicketId: string | null;
  /** Where the task stands now (`WorkTaskStatus`); `null` for a project or a deleted task. */
  taskStatusId: number | null;
  /** The task's deadline now, which may have moved since the notification was written. */
  taskDeadline: string | null;
  commentId: string | null;
  parameters: NotificationParametersModel;
  entityDeleted: boolean;
  commentDeleted: boolean;
}
