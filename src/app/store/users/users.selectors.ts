import { createFeatureSelector, createSelector } from '@ngrx/store';
import { type UsersState } from './users.state';
import { Features } from '../features.enum';

const featureSelector = createFeatureSelector<UsersState>(Features.Users);

export const getItem = createSelector(featureSelector, (s) => s.item);

export const getItems = createSelector(featureSelector, (s) => s.items);

export const getTotalCount = createSelector(featureSelector, (s) => s.totalCount);
export const getTotalPages = createSelector(featureSelector, (s) => s.totalPages);
export const getHasNext = createSelector(featureSelector, (s) => s.hasNext);
export const getHasPrevious = createSelector(featureSelector, (s) => s.hasPrevious);

export const getFilter = createSelector(featureSelector, (s) => s.filter);

export const isLoading = createSelector(featureSelector, (s) => s.isLoading);
export const isSubmitted = createSelector(featureSelector, (s) => s.isSubmitted);
