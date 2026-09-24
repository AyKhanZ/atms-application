import { Pipe, PipeTransform } from '@angular/core';
import { HistoryField } from '../../core/enums/history-field.enum';
import { DictionaryModel } from '../../core/models/dictionary.model';
import { HistoryEntryModel, HistoryValueModel } from '../../core/models/history';
import {
  HistorySubject,
  historyDate,
  historyFieldLabel,
  historyFieldList,
  HistoryMarker,
  historyMarker,
  historyFullTime,
  historyShortTime,
  historySummary,
} from '../../core/utils/history.utils';

/** "changed Status to Done" — the sentence after the author's name. */
@Pipe({ name: 'historySummary' })
export class HistorySummaryPipe implements PipeTransform {
  transform(entry: HistoryEntryModel, subject: HistorySubject): string {
    return historySummary(entry, subject);
  }
}

/** "Status · Priority · Deadline" under an entry of several changes. */
@Pipe({ name: 'historyFieldList' })
export class HistoryFieldListPipe implements PipeTransform {
  transform(entry: HistoryEntryModel): string {
    return historyFieldList(entry);
  }
}

@Pipe({ name: 'historyFieldLabel' })
export class HistoryFieldLabelPipe implements PipeTransform {
  transform(field: HistoryField): string {
    return historyFieldLabel(field);
  }
}

/** A stored dictionary value in the shape the status, priority and type components take. */
@Pipe({ name: 'historyDictionary' })
export class HistoryDictionaryPipe implements PipeTransform {
  transform(value: HistoryValueModel): DictionaryModel {
    return { id: Number(value.id), code: value.code || '', name: value.name || 'Unknown' };
  }
}

/** "22 Sep 2026" for a stored date. */
@Pipe({ name: 'historyDate' })
export class HistoryDatePipe implements PipeTransform {
  transform(value: string): string {
    return historyDate(value);
  }
}

/** `short`: "3 hours ago", "9 Sep", "12 Aug 2025". `full`: "Thu 24 Sep 2026, 14:05". */
@Pipe({ name: 'historyTime' })
export class HistoryTimePipe implements PipeTransform {
  transform(value: string | null | undefined, format: 'short' | 'full' = 'short'): string {
    if (!value) return '';
    return format === 'full' ? historyFullTime(value) : historyShortTime(value);
  }
}

/** The status dot or the icon at the right of a row, with its tooltip. */
@Pipe({ name: 'historyMarker' })
export class HistoryMarkerPipe implements PipeTransform {
  transform(entry: HistoryEntryModel): HistoryMarker | null {
    return historyMarker(entry);
  }
}
