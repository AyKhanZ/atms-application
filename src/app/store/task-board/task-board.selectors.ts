import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { TaskBoardState } from './task-board.state';

const featureSelector = createFeatureSelector<TaskBoardState>(Features.TaskBoard);

export const getPages = createSelector(featureSelector, (state) => state.pages);
export const getCounts = createSelector(featureSelector, (state) => state.counts);
export const getAssignees = createSelector(featureSelector, (state) => state.assignees);
