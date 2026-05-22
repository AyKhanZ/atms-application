import { createAction, props } from '@ngrx/store';
import { DictionaryModel } from '../../core/models/dictionary.model';

const key = '[Dictionary]';

export const loadGenderDictionaries = createAction(`${key} Load Gender Dictionaries`);
export const loadGenderDictionariesSuccess = createAction(
  `${key} Load Gender Dictionaries Success`,
  props<{ items: DictionaryModel[] }>(),
);

export const loadMaritalStatusDictionaries = createAction(
  `${key} Load Marital Status Dictionaries`,
);
export const loadMaritalStatusDictionariesSuccess = createAction(
  `${key} Load Marital Status Dictionaries Success`,
  props<{ items: DictionaryModel[] }>(),
);

export const loadUserStatusDictionaries = createAction(`${key} Load User Status Dictionaries`);
export const loadUserStatusDictionariesSuccess = createAction(
  `${key} Load User Status Dictionaries Success`,
  props<{ items: DictionaryModel[] }>(),
);

export const loadPermissionDictionaries = createAction(`${key} Load Permission Dictionaries`);
export const loadPermissionDictionariesSuccess = createAction(
  `${key} Load Permission Dictionaries Success`,
  props<{ items: DictionaryModel[] }>(),
);

export const clearAll = createAction(`${key} Clear All`);
