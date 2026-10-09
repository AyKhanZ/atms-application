import { Pipe, PipeTransform, inject } from '@angular/core';
import { formatDate } from '@angular/common';
import { TranslocoService } from '@jsverse/transloco';
import { angularLocale } from '../../core/i18n/active-language';
import { relativePhrase } from '../../core/i18n/relative-time';

// "2 hours ago" / "in 5 days", plain date when too far; a pipe so angular memoises it
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(value?: string | Date | null): string {
    if (!value) return '';

    const target = value instanceof Date ? value : new Date(value);
    const seconds = Math.round((target.getTime() - Date.now()) / 1000);
    if (!Number.isFinite(seconds)) return '';

    const translate = (key: string, params?: Record<string, string | number>) =>
      this.transloco.translate(key, params);
    if (Math.abs(seconds) < 60) return translate('time.now');

    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return relativePhrase(minutes, 'minute', translate);

    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return relativePhrase(hours, 'hour', translate);

    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return relativePhrase(days, 'day', translate);

    return formatDate(target, 'dd.MM.yyyy', angularLocale());
  }
}
