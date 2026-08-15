import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import { WorkProjectListFilter } from '../../../../core/models/work-projects';
import { ClearButtonComponent } from '../../../../shared/components/clear-button/clear-button.component';

@Component({
  selector: 'app-project-filter',
  imports: [ReactiveFormsModule, DatePickerModule, SelectModule, ClearButtonComponent],
  templateUrl: './filter.component.html',
  styleUrl: './filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFilterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private syncedKey = '';

  readonly filter = input.required<WorkProjectListFilter>();
  readonly types = input.required<DictionaryModel[]>();
  readonly kinds = input.required<DictionaryModel[]>();
  readonly statuses = input.required<DictionaryModel[]>();

  readonly apply = output<Partial<WorkProjectListFilter>>();
  readonly clear = output<void>();

  readonly form = this.fb.group(
    {
      startDate: this.fb.control<Date | null>(null),
      endDate: this.fb.control<Date | null>(null),
      projectTypeId: this.fb.control<number | null>(null),
      projectKindId: this.fb.control<number | null>(null),
      projectStatusId: this.fb.control<number | null>(null),
    },
    { validators: dateRangeValidator },
  );

  constructor() {
    effect(() => {
      const filter = this.filter();
      const key = JSON.stringify(filter);
      if (key === this.syncedKey) return;
      this.form.patchValue(
        {
          startDate: filter.startDate ? new Date(filter.startDate) : null,
          endDate: filter.endDate ? new Date(filter.endDate) : null,
          projectTypeId: filter.projectTypeId ?? null,
          projectKindId: filter.projectKindId ?? null,
          projectStatusId: filter.projectStatusId ?? null,
        },
        { emitEvent: false },
      );
      this.syncedKey = key;
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.apply.emit({
      startDate: toDate(value.startDate),
      endDate: toDate(value.endDate),
      projectTypeId: value.projectTypeId ?? undefined,
      projectKindId: value.projectKindId ?? undefined,
      projectStatusId: value.projectStatusId ?? undefined,
    });
  }

  clearForm(): void {
    this.form.reset({
      startDate: null,
      endDate: null,
      projectTypeId: null,
      projectKindId: null,
      projectStatusId: null,
    });
    this.clear.emit();
  }
}

function toDate(value: Date | null): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function dateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const start = control.get('startDate')?.value as Date | null;
  const end = control.get('endDate')?.value as Date | null;
  return start && end && start > end ? { dateRange: true } : null;
}
