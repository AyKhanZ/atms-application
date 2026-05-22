import { createFeatureSelector, createSelector } from '@ngrx/store';
import { type AuthState } from './auth.state';
import { Features } from '../features.enum';

const featureSelector = createFeatureSelector<AuthState>(Features.Auth);

export const getAccessModel = createSelector(featureSelector, (state) => state.accessModel);
export const isLoading = createSelector(featureSelector, (state) => state.isLoading);

export const isLoggedIn = createSelector(
  featureSelector,
  (s) => {
    if (!s.accessModel?.accessToken) return false;
    const expireTime = new Date(s.accessModel.accessTokenExpireTime).getTime();
    return expireTime > Date.now();
  },
);
