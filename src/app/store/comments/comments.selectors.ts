import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { CommentsState } from './comments.state';

const featureSelector = createFeatureSelector<CommentsState>(Features.Comments);

export const getLists = createSelector(featureSelector, (state) => state.lists);
