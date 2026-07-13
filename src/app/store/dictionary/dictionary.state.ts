import { DictionaryModel } from '../../core/models/dictionary.model';

export interface DictionaryState {
  genderDictionaries: DictionaryModel[];
  genderDictionariesIsLoading: boolean;

  maritalStatusDictionaries: DictionaryModel[];
  maritalStatusDictionariesIsLoading: boolean;

  userStatusDictionaries: DictionaryModel[];
  userStatusDictionariesIsLoading: boolean;

  permissionDictionaries: DictionaryModel[];
  permissionDictionariesIsLoading: boolean;

  roleDictionaries: DictionaryModel<string>[];
  roleDictionariesIsLoading: boolean;
}

export const initialDictionaryState: DictionaryState = {
  genderDictionaries: [],
  genderDictionariesIsLoading: false,

  maritalStatusDictionaries: [],
  maritalStatusDictionariesIsLoading: false,

  userStatusDictionaries: [],
  userStatusDictionariesIsLoading: false,

  permissionDictionaries: [],
  permissionDictionariesIsLoading: false,

  roleDictionaries: [],
  roleDictionariesIsLoading: false,
};