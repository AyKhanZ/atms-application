import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { angularLocale } from '../../core/i18n/active-language';

// locale comes from the active language; LOCALE_ID is fixed at startup and the login page switches without a reload
@Pipe({ name: 'appDate' })
export class AppDatePipe implements PipeTransform {
  transform(
    value: Date | string | number | null | undefined,
    format: string,
    timezone?: string,
  ): string | null {
    if (value == null || value === '') return null;

    try {
      return formatDate(value, format, angularLocale(), timezone);
    } catch {
      return null;
    }
  }
}
