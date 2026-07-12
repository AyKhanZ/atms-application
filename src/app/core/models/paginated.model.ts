import { SortDirectionEnum } from '../enums/sort-direction.enum';

export interface PaginationRequest {
  page: number;
  pageSize: number;
  sortBy: string;
  sortDirection: SortDirectionEnum;
}


export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function createPaginationRequest(sortBy = 'createdAt', sortDirection = SortDirectionEnum.Desc): PaginationRequest {
  return { page: 1, pageSize: 10, sortBy, sortDirection };
}
