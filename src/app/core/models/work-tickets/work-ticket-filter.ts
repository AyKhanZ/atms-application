export interface WorkTicketFilter {
  search?: string;
  cursor?: string | null;
  pageSize?: number;
  milestoneId?: string | null;
}
