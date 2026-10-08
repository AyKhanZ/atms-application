import { PersonModel } from '../person.model';
import { HistoryValueModel } from './history-value.model';

export interface HistoryStateModel {
  status: HistoryValueModel;
  // no date = status before history started
  changedAt?: string | null;
  changedBy?: PersonModel | null;
}
