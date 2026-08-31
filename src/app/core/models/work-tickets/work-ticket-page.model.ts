import { WorkTicketModel } from './work-ticket.model';

export interface WorkTicketPageModel {
  items: WorkTicketModel[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
