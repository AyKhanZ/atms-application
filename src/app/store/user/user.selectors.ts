import { createFeatureSelector, createSelector } from '@ngrx/store';
import { type UserState } from './user.state';
import { Features } from '../features.enum';

const featureSelector = createFeatureSelector<UserState>(Features.User);

export const getMe = createSelector(featureSelector, (state) => state.me);
export const getRoles = createSelector(featureSelector, (state) => state.roles);
export const getPermissions = createSelector(featureSelector, (state) => state.permissions);

export const isLoading = createSelector(featureSelector, (state) => state.isLoading);
