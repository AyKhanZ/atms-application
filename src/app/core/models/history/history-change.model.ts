import { HistoryField } from '../../enums/history-field.enum';
import { HistoryPersonModel } from './history-person.model';
import { HistoryValueModel } from './history-value.model';

export interface HistoryChangeModel {
  field: HistoryField;
  /** Whose role changed, for a stakeholder change. */
  person?: HistoryPersonModel | null;
  oldValue?: HistoryValueModel | null;
  newValue?: HistoryValueModel | null;
}
