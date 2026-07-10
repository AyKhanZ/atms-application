import { SortDirectionEnum } from '../enums/sort-direction.enum';

export interface PaginatedFilter {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: SortDirectionEnum;
}
