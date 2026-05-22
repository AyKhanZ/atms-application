import { createFeatureSelector, createSelector } from '@ngrx/store';
import { Features } from '../features.enum';
import { DictionaryState } from './dictionary.state';

const featureSelector = createFeatureSelector<DictionaryState>(Features.Dictionary);

export const getGendersDictionaries = createSelector(featureSelector, (s) => s.genderDictionaries);
export const getGendersDictionariesIsLoading = createSelector(
  featureSelector,
  (s) => s.genderDictionariesIsLoading,
);

export const getUserStatusesDictionaries = createSelector(
  featureSelector,
  (s) => s.userStatusDictionaries,
);
export const getUserStatusesDictionariesIsLoading = createSelector(
  featureSelector,
  (s) => s.userStatusDictionariesIsLoading,
);

export const getMaritalStatusesDictionaries = createSelector(
  featureSelector,
  (s) => s.maritalStatusDictionaries,
);
export const getMaritalStatusesDictionariesIsLoading = createSelector(
  featureSelector,
  (s) => s.maritalStatusDictionariesIsLoading,
);

export const getPermissionDictionaries = createSelector(
  featureSelector,
  (s) => s.permissionDictionaries,
);
export const getPermissionDictionariesIsLoading = createSelector(
  featureSelector,
  (s) => s.permissionDictionariesIsLoading,
);
