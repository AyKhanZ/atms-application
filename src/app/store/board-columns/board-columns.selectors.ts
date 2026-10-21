import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { BoardColumnsState } from './board-columns.state';

const feature = createFeatureSelector<BoardColumnsState>(Features.BoardColumns);

export const getItems = createSelector(feature, (state) => state?.items ?? []);
export const getLoaded = createSelector(feature, (state) => state?.loaded ?? false);
