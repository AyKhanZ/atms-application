import { Pipe, PipeTransform } from '@angular/core';
import { formatDate } from '@angular/common';
import { angularLocale, currentLanguage } from '../../core/i18n/active-language';

// "2 hours ago" / "in 5 days", plain date when too far; a pipe so angular memoises it
@Pipe({ name: 'relativeTime' })
export class RelativeTimePipe implements PipeTransform {
  transform(value?: string | Date | null): string {
    if (!value) return '';

    const target = value instanceof Date ? value : new Date(value);
    const seconds = Math.round((target.getTime() - Date.now()) / 1000);
    if (!Number.isFinite(seconds)) return '';

    const formatter = new Intl.RelativeTimeFormat(currentLanguage(), { numeric: 'auto' });
    if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');

    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');

    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');

    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return formatter.format(days, 'day');

    return formatDate(target, 'dd.MM.yyyy', angularLocale());
  }
}
