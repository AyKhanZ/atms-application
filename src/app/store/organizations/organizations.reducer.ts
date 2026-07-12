import { type Action, createReducer, on } from '@ngrx/store';
import * as OrganizationsStoreActions from './organizations.actions';
import { createDefaultOrganizationListFilter } from '../../core/models/organizations/organizations.models';
import { type OrganizationsState, initialOrganizationsState } from './organizations.state';

const reducer = createReducer<OrganizationsState>(
  initialOrganizationsState,
  on(OrganizationsStoreActions.loadOrganizations, (state, { filter }): OrganizationsState => ({
    ...state,
    isLoading: true,
    filter: { ...state.filter, ...filter },
  })),
  on(OrganizationsStoreActions.loadOrganizationsSuccess, (state, { response }): OrganizationsState => ({
    ...state,
    isLoading: false,
    items: response.items,
    totalCount: response.totalCount,
    totalPages: response.totalPages,
    hasNext: response.hasNext,
    hasPrevious: response.hasPrevious,
  })),
  on(OrganizationsStoreActions.loadOrganizationsFailure, (state): OrganizationsState => ({ ...state, isLoading: false })),
  on(OrganizationsStoreActions.loadOrganization, (state): OrganizationsState => ({ ...state, isLoading: true })),
  on(OrganizationsStoreActions.loadOrganizationSuccess, (state, { item }): OrganizationsState => ({ ...state, isLoading: false, item })),
  on(OrganizationsStoreActions.loadOrganizationFailure, (state): OrganizationsState => ({ ...state, isLoading: false })),
  on(OrganizationsStoreActions.createOrganization, (state): OrganizationsState => ({ ...state, isSubmitted: true })),
  on(OrganizationsStoreActions.createOrganizationSuccess, (state): OrganizationsState => ({ ...state, isSubmitted: false })),
  on(OrganizationsStoreActions.createOrganizationFailure, (state): OrganizationsState => ({ ...state, isSubmitted: false })),
  on(OrganizationsStoreActions.updateOrganization, (state): OrganizationsState => ({ ...state, isSubmitted: true })),
  on(OrganizationsStoreActions.updateOrganizationSuccess, (state): OrganizationsState => ({ ...state, isSubmitted: false })),
  on(OrganizationsStoreActions.updateOrganizationFailure, (state): OrganizationsState => ({ ...state, isSubmitted: false })),
  on(OrganizationsStoreActions.deleteOrganization, (state): OrganizationsState => ({ ...state, isSubmitted: true })),
  on(OrganizationsStoreActions.deleteOrganizationSuccess, (state, { id }): OrganizationsState => ({
    ...state,
    isSubmitted: false,
    items: state.items.filter((item) => item.id !== id),
    totalCount: Math.max(0, state.totalCount - 1),
  })),
  on(OrganizationsStoreActions.deleteOrganizationFailure, (state): OrganizationsState => ({ ...state, isSubmitted: false })),
  on(OrganizationsStoreActions.clearItem, (state): OrganizationsState => ({ ...state, item: null, isLoading: false, isSubmitted: false })),
  on(OrganizationsStoreActions.clearItems, (state): OrganizationsState => ({
    ...state,
    items: [],
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false,
    filter: createDefaultOrganizationListFilter(),
    isLoading: false,
  })),
  on(OrganizationsStoreActions.clearAll, (): OrganizationsState => initialOrganizationsState),
);

export function organizationsReducer(state: OrganizationsState | undefined, action: Action): OrganizationsState {
  return reducer(state, action);
}
