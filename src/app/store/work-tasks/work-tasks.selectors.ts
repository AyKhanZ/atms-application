import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { WorkTasksState } from './work-tasks.state';

const featureSelector = createFeatureSelector<WorkTasksState>(Features.WorkTasks);

export const getPages = createSelector(featureSelector, (state) => state.pages);
export const getItem = createSelector(featureSelector, (state) => state.item);
export const isDetailLoading = createSelector(featureSelector, (state) => state.detailLoading);
export const getDetailError = createSelector(featureSelector, (state) => state.detailError);
export const isSaving = createSelector(featureSelector, (state) => state.saving);
export const getMutationError = createSelector(featureSelector, (state) => state.mutationError);
