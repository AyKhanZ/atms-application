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

// same snapshot = no save, typing a letter and deleting it isnt a change
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

// a +994 number of wrong length never reaches the server
function phoneNumberShape(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value.trim();
  if (!value) return null;
  if (!internationalShape.test(value)) return { pattern: true };

  return hasWrongAzerbaijanLength(value) ? { phoneLength: true } : null;
}

export function yearsAgo(years: number, now = new Date()): Date {
  return new Date(now.getFullYear() - years, now.getMonth(), now.getDate());
}

// 18 to 100 like the server; the calendar greys out dates but a typed one would get through
export function birthDateInRange(control: AbstractControl<Date | null>): ValidationErrors | null {
  const value = control.value;
  if (!value) return null;
  if (value > yearsAgo(18)) return { tooYoung: true };
  if (value < yearsAgo(100)) return { tooOld: true };
  return null;
}
