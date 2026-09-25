import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { HistoryState } from './history.state';

const featureSelector = createFeatureSelector<HistoryState>(Features.History);

export const getLists = createSelector(featureSelector, (state) => state.lists);
