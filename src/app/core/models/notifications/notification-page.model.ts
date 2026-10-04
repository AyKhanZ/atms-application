import { NotificationModel } from './notification.model';

export interface NotificationPageModel {
  items: NotificationModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
