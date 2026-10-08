import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { hasWrongAzerbaijanLength } from '../../../core/utils/phone-number.utils';

export type PersonalInfoForm = FormGroup<{
  name: FormControl<string>;
  surname: FormControl<string>;
  email: FormControl<string>;
  phoneNumber: FormControl<string>;
  position: FormControl<string>;
  languageId: FormControl<number | null>;
  birthDate: FormControl<Date | null>;
  genderId: FormControl<number | null>;
  maritalStatusId: FormControl<number | null>;
  avatar: FormControl<File | null>;
}>;

export function createPersonalInfoForm(): PersonalInfoForm {
  return new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    surname: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', { nonNullable: true }),
    phoneNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(20), phoneNumberShape],
    }),
    position: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    languageId: new FormControl<number | null>(null, Validators.required),
    birthDate: new FormControl<Date | null>(null, [Validators.required, birthDateInRange]),
    genderId: new FormControl<number | null>(null, Validators.required),
    maritalStatusId: new FormControl<number | null>(null, Validators.required),
    avatar: new FormControl<File | null>(null),
  });
}

/**
 * What a save would send, as one comparable string: trimmed text, the calendar date, the ids and
 * the chosen photo. Two values with the same snapshot need no save, so typing a letter and
 * deleting it again does not count as a change.
 */
export function personalInfoSnapshot(value: ReturnType<PersonalInfoForm['getRawValue']>): string {
  const birthDate = value.birthDate
    ? [value.birthDate.getFullYear(), value.birthDate.getMonth(), value.birthDate.getDate()]
    : null;
  const avatar = value.avatar
    ? [value.avatar.name, value.avatar.size, value.avatar.lastModified]
    : null;

  return JSON.stringify([
    value.name.trim(),
    value.surname.trim(),
    value.phoneNumber.trim(),
    value.position.trim(),
    value.languageId,
    birthDate,
    value.genderId,
    value.maritalStatusId,
    avatar,
  ]);
}

const internationalShape = /^\+[0-9 ()-]{7,19}$/;

/** Shape first, then the country length. A +994 number of the wrong length never reaches the server. */
function phoneNumberShape(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (!value) return null;
  if (!internationalShape.test(value)) return { pattern: true };

  return hasWrongAzerbaijanLength(value) ? { phoneLength: true } : null;
}

/** Local midnight `years` years before today: the edges of the allowed birth-date range. */
export function yearsAgo(years: number, now = new Date()): Date {
  return new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
}

/**
 * 18 to 100 years old, the same range the server checks. The calendar greys out other dates, but a
 * date typed by hand would otherwise reach the server unchecked.
 */
export function birthDateInRange(control: AbstractControl<Date | null>): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  if (value > yearsAgo(18)) return { tooYoung: true };
  if (value < yearsAgo(100)) return { tooOld: true };
  return null;
}
