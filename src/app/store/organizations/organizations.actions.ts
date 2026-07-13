import { createAction, props } from '@ngrx/store';
import { PaginatedResponse } from '../../core/models/paginated.model';
import {
  CreateOrganizationCommand,
  OrganizationListFilter,
  OrganizationListItemModel,
  OrganizationModel,
  UpdateOrganizationCommand,
} from '../../core/models/organizations/organizations.models';

const key = '[organizations]';

export const loadOrganizations = createAction(`${key} Load Organizations`, props<{ filter: OrganizationListFilter }>());
export const loadOrganizationsSuccess = createAction(`${key} Load Organizations Success`, props<{ response: PaginatedResponse<OrganizationListItemModel> }>());
export const loadOrganizationsFailure = createAction(`${key} Load Organizations Failure`);

export const loadOrganization = createAction(`${key} Load Organization`, props<{ id: string }>());
export const loadOrganizationSuccess = createAction(`${key} Load Organization Success`, props<{ item: OrganizationModel }>());
export const loadOrganizationFailure = createAction(`${key} Load Organization Failure`);

export const createOrganization = createAction(`${key} Create Organization`, props<{ command: CreateOrganizationCommand }>());
export const createOrganizationSuccess = createAction(`${key} Create Organization Success`, props<{ id: string }>());
export const createOrganizationFailure = createAction(`${key} Create Organization Failure`);

export const updateOrganization = createAction(`${key} Update Organization`, props<{ command: UpdateOrganizationCommand }>());
export const updateOrganizationSuccess = createAction(`${key} Update Organization Success`);
export const updateOrganizationFailure = createAction(`${key} Update Organization Failure`);

export const deleteOrganization = createAction(`${key} Delete Organization`, props<{ id: string }>());
export const deleteOrganizationSuccess = createAction(`${key} Delete Organization Success`, props<{ id: string }>());
export const deleteOrganizationFailure = createAction(`${key} Delete Organization Failure`);

export const clearItem = createAction(`${key} Clear Item`);
export const clearItems = createAction(`${key} Clear Items`);
export const clearAll = createAction(`${key} Clear All`);