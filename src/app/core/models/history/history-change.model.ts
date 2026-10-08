import { HistoryField } from '../../enums/history-field.enum';
import { PersonModel } from '../person.model';
import { HistoryValueModel } from './history-value.model';

export interface HistoryChangeModel {
  field: HistoryField;
  // for stakeholder changes
  person?: PersonModel | null;
  oldValue?: HistoryValueModel | null;
  newValue?: HistoryValueModel | null;
}
