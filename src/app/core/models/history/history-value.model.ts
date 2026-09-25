import { DictionaryModel } from '../dictionary.model';
import { HistoryPersonModel } from './history-person.model';

/**
 * A value ready to show: `id` is what was stored (a status id, a date, a text), `code` the
 * dictionary code or the `34` of a ticket, `name` the label. A text or a date has no code, and a
 * value whose item is gone for good has no name: both come empty, so check them for emptiness.
 */
export interface HistoryValueModel extends DictionaryModel<string> {
  /** Set for an assignee. */
  person?: HistoryPersonModel | null;
}
