import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { WorkGroupsState } from './work-groups.state';

const featureSelector = createFeatureSelector<WorkGroupsState>(Features.WorkGroups);

export const getItems = createSelector(featureSelector, (state) => state.items);
export const getProjectId = createSelector(featureSelector, (state) => state.projectId);
export const isLoading = createSelector(featureSelector, (state) => state.isLoading);
export const isSaving = createSelector(featureSelector, (state) => state.isSaving);
export const getLoadError = createSelector(featureSelector, (state) => state.loadError);
