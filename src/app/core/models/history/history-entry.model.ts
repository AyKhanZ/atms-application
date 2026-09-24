import { HistoryAction } from '../../enums/history-action.enum';
import { HistoryEntityType } from '../../enums/history-entity-type.enum';
import { HistoryChangeModel } from './history-change.model';
import { HistoryPersonModel } from './history-person.model';
import { HistoryValueModel } from './history-value.model';

export interface HistoryEntryModel {
  id: string;
  entityType: HistoryEntityType;
  action: HistoryAction;
  createdAt: string;
  /** No author: a background job made the change. */
  createdBy?: HistoryPersonModel | null;
  /** The group or milestone an entry of the project history is about. */
  subject?: HistoryValueModel | null;
  changes: HistoryChangeModel[];
}
