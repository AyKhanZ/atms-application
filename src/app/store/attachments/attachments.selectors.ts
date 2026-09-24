import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { AttachmentsState } from './attachments.state';

const featureSelector = createFeatureSelector<AttachmentsState>(Features.Attachments);

export const getLists = createSelector(featureSelector, (state) => state.lists);
export const getTrees = createSelector(featureSelector, (state) => state.trees);
export const getUploads = createSelector(featureSelector, (state) => state.uploads);
export const getPendingIds = createSelector(featureSelector, (state) => state.pendingIds);
