import { PaginationRequest, createPaginationRequest } from '../paginated.model';

export interface WorkProjectListFilter extends PaginationRequest {
  search?: string;
  startDate?: string;
  endDate?: string;
  projectTypeId?: number;
  projectKindId?: number;
  projectStatusId?: number;
}

export function createDefaultWorkProjectListFilter(): WorkProjectListFilter {
  return createPaginationRequest();
}
