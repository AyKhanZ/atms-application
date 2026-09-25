import { HistoryPersonModel } from './history-person.model';
import { HistoryValueModel } from './history-value.model';

/** One status on the way from the first to the current one. */
export interface HistoryStateModel {
  status: HistoryValueModel;
  /** No date: the status an item already had when the history started. */
  changedAt?: string | null;
  changedBy?: HistoryPersonModel | null;
}
