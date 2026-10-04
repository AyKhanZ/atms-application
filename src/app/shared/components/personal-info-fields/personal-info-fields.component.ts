import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { LanguageModel } from '../../../core/models/language.model';
import { LabelForDirective } from '../../../core/directives/label-for.directive';
import { formatDateInput, parseDisplayDate } from '../../../core/utils/date-input.utils';
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

  readonly languageOptions = computed(() =>
    this.languages().map((language) => ({
      id: language.id,
      label: `${language.nativeName} (${language.code})`,
    })),
  );
  readonly minBirthDate = yearsAgo(100);
  readonly maxBirthDate = yearsAgo(18);

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
}
