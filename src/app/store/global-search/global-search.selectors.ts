import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { GlobalSearchState } from './global-search.state';

const featureSelector = createFeatureSelector<GlobalSearchState>(Features.GlobalSearch);

export const getPopupQuery = createSelector(featureSelector, (state) => state.popupQuery);
export const getPopupResult = createSelector(featureSelector, (state) => state.popupResult);
export const isPopupLoading = createSelector(featureSelector, (state) => state.popupLoading);
export const getPopupError = createSelector(featureSelector, (state) => state.popupError);
export const getPopupRecent = createSelector(featureSelector, (state) => state.popupRecent);

export const getPageQuery = createSelector(featureSelector, (state) => state.page.query);
export const getPageItemType = createSelector(featureSelector, (state) => state.page.itemType);
export const getPageItems = createSelector(featureSelector, (state) => state.page.items);
export const getPageCursor = createSelector(featureSelector, (state) => state.page.nextCursor);
export const pageHasMore = createSelector(featureSelector, (state) => state.page.hasMore);
export const isPageLoading = createSelector(featureSelector, (state) => state.page.loading);
export const getPageError = createSelector(featureSelector, (state) => state.page.error);
