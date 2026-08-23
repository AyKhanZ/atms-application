import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { WorkProjectsState } from './work-projects.state';

const featureSelector = createFeatureSelector<WorkProjectsState>(Features.WorkProjects);
export const getItems = createSelector(featureSelector, (state) => state.items);
export const getItem = createSelector(featureSelector, (state) => state.item);
export const getTotalCount = createSelector(featureSelector, (state) => state.totalCount);
export const isLoading = createSelector(featureSelector, (state) => state.isLoading);
export const isSubmitted = createSelector(featureSelector, (state) => state.isSubmitted);
