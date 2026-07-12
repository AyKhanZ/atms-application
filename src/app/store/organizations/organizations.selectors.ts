import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { type OrganizationsState } from './organizations.state';

const featureSelector = createFeatureSelector<OrganizationsState>(Features.Organizations);

export const getItem = createSelector(featureSelector, (s) => s.item);
export const getItems = createSelector(featureSelector, (s) => s.items);
export const getTotalCount = createSelector(featureSelector, (s) => s.totalCount);
export const getTotalPages = createSelector(featureSelector, (s) => s.totalPages);
export const getHasNext = createSelector(featureSelector, (s) => s.hasNext);
export const getHasPrevious = createSelector(featureSelector, (s) => s.hasPrevious);
export const getFilter = createSelector(featureSelector, (s) => s.filter);
export const isLoading = createSelector(featureSelector, (s) => s.isLoading);
export const isSubmitted = createSelector(featureSelector, (s) => s.isSubmitted);
