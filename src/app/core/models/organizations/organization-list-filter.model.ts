import { PaginationRequest, createPaginationRequest } from '../paginated.model';

export interface OrganizationListFilter extends PaginationRequest {
  search?: string;
  createdFrom?: string;
  createdTo?: string;
}

export function createDefaultOrganizationListFilter(): OrganizationListFilter {
  return createPaginationRequest();
}
