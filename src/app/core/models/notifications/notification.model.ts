import { PersonModel } from '../person.model';
import { NotificationParametersModel } from './notification-parameters.model';

export interface NotificationModel {
  id: string;
  // NotificationType
  type: number;
  createdAt: string;
  readAt: string | null;
  // null = system (deadline reminders)
  actor: PersonModel | null;
  projectId: string;
  // NotificationEntityType
  entityType: number;
  entityId: string;
  // current ticket, null for project or deleted task
  workTicketId: string | null;
  // current WorkTaskStatus, null for project or deleted task
  taskStatusId: number | null;
  // current deadline, can differ from the one in the text
  taskDeadline: string | null;
  commentId: string | null;
  parameters: NotificationParametersModel;
  entityDeleted: boolean;
  commentDeleted: boolean;
}
