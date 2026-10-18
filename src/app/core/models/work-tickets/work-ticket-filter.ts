import { SortDirectionEnum } from '../../enums/sort-direction.enum';

export interface WorkTicketFilter {
  search?: string;
  cursor?: string | null;
  pageSize?: number;
  milestoneId?: string | null;
  sortDirection?: SortDirectionEnum;
}
