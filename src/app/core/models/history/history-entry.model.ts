import { HistoryAction } from '../../enums/history-action.enum';
import { HistoryEntityType } from '../../enums/history-entity-type.enum';
import { HistoryChangeModel } from './history-change.model';
import { PersonModel } from '../person.model';
import { HistoryValueModel } from './history-value.model';

export interface HistoryEntryModel {
  id: string;
  entityType: HistoryEntityType;
  action: HistoryAction;
  createdAt: string;
  // null = made by a background job
  createdBy?: PersonModel | null;
  // group or milestone, for project history
  subject?: HistoryValueModel | null;
  changes: HistoryChangeModel[];
}
