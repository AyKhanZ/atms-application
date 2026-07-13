import {
  createDefaultOrganizationListFilter,
  OrganizationListFilter,
  OrganizationListItemModel,
  OrganizationModel,
} from '../../core/models/organizations/organizations.models';

export interface OrganizationsState {
  items: OrganizationListItemModel[];
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  item: OrganizationModel | null;
  filter: OrganizationListFilter;
  isLoading: boolean;
  isSubmitted: boolean;
}

export const initialOrganizationsState: OrganizationsState = {
  items: [],
  totalCount: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  item: null,
  filter: createDefaultOrganizationListFilter(),
  isLoading: false,
  isSubmitted: false,
};
