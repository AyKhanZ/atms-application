import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { HistoryField } from '../../core/enums/history-field.enum';
import { DictionaryModel } from '../../core/models/dictionary.model';
import { HistoryEntryModel, HistoryValueModel } from '../../core/models/history';
import {
  HistorySubject,
  HistoryTranslate,
  historyDate,
  historyFieldLabel,
  historyFieldList,
  HistoryMarker,
  historyMarker,
  historyFullTime,
  historyShortTime,
  historySummary,
} from '../../core/utils/history.utils';

// "changed Status to Done"
@Pipe({ name: 'historySummary' })
export class HistorySummaryPipe implements PipeTransform {
  private readonly translate = historyTranslate();

  transform(entry: HistoryEntryModel, subject: HistorySubject): string {
    return historySummary(entry, subject, this.translate);
  }
}

// "Status · Priority · Deadline"
@Pipe({ name: 'historyFieldList' })
export class HistoryFieldListPipe implements PipeTransform {
  private readonly translate = historyTranslate();

  transform(entry: HistoryEntryModel): string {
    return historyFieldList(entry, this.translate);
  }
}

@Pipe({ name: 'historyFieldLabel' })
export class HistoryFieldLabelPipe implements PipeTransform {
  private readonly translate = historyTranslate();

  transform(field: HistoryField): string {
    return historyFieldLabel(field, this.translate);
  }
}

@Pipe({ name: 'historyDictionary' })
export class HistoryDictionaryPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(value: HistoryValueModel): DictionaryModel {
    return {
      id: Number(value.id),
      code: value.code || '',
      name: value.name || this.transloco.translate('history.unknown'),
    };
  }
}

// "22 Sep 2026"
@Pipe({ name: 'historyDate' })
export class HistoryDatePipe implements PipeTransform {
  transform(value: string): string {
    return historyDate(value);
  }
}

// short: "3 hours ago", "9 Sep", "12 Aug 2025"; full: "Thu 24 Sep 2026, 14:05"
@Pipe({ name: 'historyTime' })
export class HistoryTimePipe implements PipeTransform {
  private readonly translate = historyTranslate();

  transform(value: string | null | undefined, format: 'short' | 'full' = 'short'): string {
    if (!value) return '';
    return format === 'full' ? historyFullTime(value) : historyShortTime(value, this.translate);
  }
}

@Pipe({ name: 'historyMarker' })
export class HistoryMarkerPipe implements PipeTransform {
  private readonly translate = historyTranslate();

  transform(entry: HistoryEntryModel): HistoryMarker | null {
    return historyMarker(entry, this.translate);
  }
}

function historyTranslate(): HistoryTranslate {
  const transloco = inject(TranslocoService);
  return (key, params) => transloco.translate(key, params);
}
