import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { DashboardState } from './dashboard.state';

const feature = createFeatureSelector<DashboardState>(Features.Dashboard);

export const getState = feature;
export const getModel = createSelector(feature, (state) => state.model);
export const getLoading = createSelector(feature, (state) => state.loading);
export const getError = createSelector(feature, (state) => state.error);
export const getProjectOptions = createSelector(feature, (state) => state.projectOptions);
export const getSelectedProject = createSelector(feature, (state) => state.selectedProject);
export const getPriorities = createSelector(feature, (state) => state.priorities);
