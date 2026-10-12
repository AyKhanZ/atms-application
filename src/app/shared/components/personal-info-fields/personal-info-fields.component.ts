import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { TranslocoDirective } from '@jsverse/transloco';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { LanguageModel } from '../../../core/models/language.model';
import { LabelForDirective } from '../../../core/directives/label-for.directive';
import { formatDateInput, parseDisplayDate } from '../../../core/utils/date-input.utils';
import { azerbaijanDigits, formatPhoneDigits } from '../../../core/utils/phone-number.utils';
import { PhoneDigitsPipe } from '../../pipes/phone-digits.pipe';
import { PersonalInfoForm, yearsAgo } from './personal-info.form';

@Component({
  selector: 'app-personal-info-fields',
  imports: [
    ReactiveFormsModule,
    DatePickerModule,
    InputTextModule,
    SelectModule,
    TooltipModule,
    LabelForDirective,
    TranslocoDirective,
    PhoneDigitsPipe,
  ],
  templateUrl: './personal-info-fields.component.html',
  styleUrl: './personal-info-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalInfoFieldsComponent {
  readonly form = input.required<PersonalInfoForm>();
  readonly languages = input.required<LanguageModel[]>();
  readonly genders = input.required<DictionaryModel[]>();
  readonly maritalStatuses = input.required<DictionaryModel[]>();
  // onboarding only: the interface switches after Continue, not when the value changes
  readonly languageChangesAfterContinue = input(false);

  readonly languageOptions = computed(() =>
    this.languages().map((language) => ({
      id: language.id,
      label: `${language.nativeName} (${language.code})`,
    })),
  );
  readonly minBirthDate = yearsAgo(100);
  readonly maxBirthDate = yearsAgo(18);

  // a full field takes no more digits; 994… is let through, someone is typing the code again
  onPhoneBeforeInput(event: InputEvent): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const nothingSelected = input.selectionStart === input.selectionEnd;
    if (
      event.inputType === 'insertText' &&
      nothingSelected &&
      digits.length === 9 &&
      !digits.startsWith('994')
    ) {
      event.preventDefault();
    }
  }

  // backspace right after a space would remove only the space, and the grouping puts it back
  onPhoneKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const caret = input.selectionStart ?? 0;
    if (
      event.key === 'Backspace' &&
      caret === input.selectionEnd &&
      input.value[caret - 1] === ' '
    ) {
      input.setSelectionRange(caret - 1, caret - 1);
    }
  }

  // a number pasted from contacts replaces the field, whatever prefix it was written with
  onPhonePaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (text.replace(/\D/g, '').length < 9) return;

    event.preventDefault();
    this.writePhone(event.target as HTMLInputElement, azerbaijanDigits(text), Infinity);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const raw = input.value;
    const digits = raw.replace(/\D/g, '');

    // autofill or a typed 994…: the whole value is a number with its prefix
    if (digits.length > 9) {
      this.writePhone(input, azerbaijanDigits(raw), Infinity);
      return;
    }

    // no Azerbaijan number starts with 0 after +994, a typed 050… means 50…
    const caret = input.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    const zeros = digits.length - digits.replace(/^0+/, '').length;
    this.writePhone(input, digits.slice(zeros), Math.max(0, digitsBefore - zeros));
  }

  onBirthDateInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    const formattedValue = formatDateInput(input.value);
    if (input.value !== formattedValue) input.value = formattedValue;

    const date = parseDisplayDate(formattedValue);
    if (date) {
      this.form().controls.birthDate.setValue(date);
      this.form().controls.birthDate.markAsDirty();
    }
  }

  onBirthDateBlur(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (input?.value && !parseDisplayDate(input.value)) {
      this.form().controls.birthDate.setValue(null);
    }
  }

  private writePhone(input: HTMLInputElement, digits: string, digitsBeforeCaret: number): void {
    const formatted = formatPhoneDigits(digits.slice(0, 9));
    const control = this.form().controls.phoneNumber;
    if (control.value !== formatted) control.setValue(formatted);
    control.markAsDirty();
    if (input.value !== formatted) input.value = formatted;

    // the caret stays after the same digit, the spaces around it moved
    let caret = 0;
    for (let seen = 0; caret < formatted.length && seen < digitsBeforeCaret; caret++) {
      if (formatted[caret] !== ' ') seen++;
    }
    input.setSelectionRange(caret, caret);
  }
}
