import { DictionaryModel } from '../dictionary.model';
import { PersonModel } from '../person.model';

// id is the stored value, code the dict code or ticket number, name the label
// text and date have no code, a deleted item has no name, both come empty
export interface HistoryValueModel extends DictionaryModel<string> {
  // only for assignee
  person?: PersonModel | null;
}
