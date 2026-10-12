import { Pipe, PipeTransform } from '@angular/core';
import { phoneDigitCount } from '../../core/utils/phone-number.utils';

// the counter reads 7/9, spaces between the groups are not digits
@Pipe({ name: 'phoneDigits' })
export class PhoneDigitsPipe implements PipeTransform {
  transform(value: string | null | undefined): number {
    return phoneDigitCount(value);
  }
}
