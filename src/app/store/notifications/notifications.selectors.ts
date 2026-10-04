import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { NotificationsState } from './notifications.state';

const featureSelector = createFeatureSelector<NotificationsState>(Features.Notifications);

export const getUnreadCount = createSelector(featureSelector, (state) => state.unreadCount);
export const getLatest = createSelector(featureSelector, (state) => state.latest);
export const getLatestLoaded = createSelector(featureSelector, (state) => state.latestLoaded);
export const getLatestOpen = createSelector(featureSelector, (state) => state.latestOpen);
export const getLatestLoading = createSelector(featureSelector, (state) => state.latestLoading);
export const getLatestError = createSelector(featureSelector, (state) => state.latestError);
export const getPage = createSelector(featureSelector, (state) => state.page);
