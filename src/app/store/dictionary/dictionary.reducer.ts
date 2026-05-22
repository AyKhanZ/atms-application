import { type Action, createReducer, on } from '@ngrx/store';
import { DictionaryState, initialDictionaryState } from './dictionary.state';
import { DictionaryStoreActions } from './index';

const reducer = createReducer<DictionaryState>(
  initialDictionaryState,

  on(
    DictionaryStoreActions.loadGenderDictionaries,
    (state): DictionaryState => ({
      ...state,
      genderDictionariesIsLoading: true,
    }),
  ),
  on(
    DictionaryStoreActions.loadGenderDictionariesSuccess,
    (state, { items }): DictionaryState => ({
      ...state,
      genderDictionariesIsLoading: false,
      genderDictionaries: items,
    }),
  ),

  on(
    DictionaryStoreActions.loadMaritalStatusDictionaries,
    (state): DictionaryState => ({
      ...state,
      maritalStatusDictionariesIsLoading: true,
    }),
  ),
  on(
    DictionaryStoreActions.loadMaritalStatusDictionariesSuccess,
    (state, { items }): DictionaryState => ({
      ...state,
      maritalStatusDictionariesIsLoading: false,
      maritalStatusDictionaries: items,
    }),
  ),

  on(
    DictionaryStoreActions.loadUserStatusDictionaries,
    (state): DictionaryState => ({
      ...state,
      userStatusDictionariesIsLoading: true,
    }),
  ),
  on(
    DictionaryStoreActions.loadUserStatusDictionariesSuccess,
    (state, { items }): DictionaryState => ({
      ...state,
      userStatusDictionariesIsLoading: false,
      userStatusDictionaries: items,
    }),
  ),

  on(
    DictionaryStoreActions.loadPermissionDictionaries,
    (state): DictionaryState => ({
      ...state,
      permissionDictionariesIsLoading: true,
    }),
  ),
  on(
    DictionaryStoreActions.loadPermissionDictionariesSuccess,
    (state, { items }): DictionaryState => ({
      ...state,
      permissionDictionariesIsLoading: false,
      permissionDictionaries: items,
    }),
  ),

  on(DictionaryStoreActions.clearAll, (): DictionaryState => initialDictionaryState),
);

export function dictionaryReducer(state: DictionaryState | undefined, action: Action): DictionaryState {
  return reducer(state, action);
}
