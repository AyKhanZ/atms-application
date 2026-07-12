import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { OrganizationListFilter } from '../../../../../core/models/organizations/organizations.models';
import { ClearButtonComponent } from '../../../../../shared/components/clear-button/clear-button.component';

export interface OrganizationsFilterFormValue {
  createdFrom: Date | null;
  createdTo: Date | null;
}

@Component({
  selector: 'app-organizations-filter',
  imports: [ReactiveFormsModule, ClearButtonComponent, DatePickerModule],
  templateUrl: './filter-organizations.component.html',
  styleUrl: './filter-organizations.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationsFilterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private syncedFilterKey = '';
  readonly today = endOfToday();

  readonly filter = input.required<OrganizationListFilter>();
  readonly apply = output<Partial<OrganizationListFilter>>();
  readonly clear = output<void>();

  readonly form = this.fb.group(
    {
      createdFrom: this.fb.control<Date | null>(null),
      createdTo: this.fb.control<Date | null>(null),
    },
    { validators: createdDateRangeValidator },
  );

  constructor() {
    effect(() => {
      const filter = this.filter();
      const filterKey = filterSyncKey(filter);
      if (filterKey === this.syncedFilterKey) return;

      this.form.patchValue(
        {
          createdFrom: filter.createdFrom ? new Date(filter.createdFrom) : null,
          createdTo: filter.createdTo ? new Date(filter.createdTo) : null,
        },
        { emitEvent: false },
      );
      this.syncedFilterKey = filterKey;
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.apply.emit(filterFromForm(this.form.getRawValue()));
  }

  createdFromMaxDate(): Date {
    const createdTo = this.form.controls.createdTo.value;
    return createdTo && createdTo < this.today ? createdTo : this.today;
  }

  createdToMinDate(): Date | null {
    return this.form.controls.createdFrom.value;
  }

  clearForm(): void {
    this.form.reset({ createdFrom: null, createdTo: null });
    this.clear.emit();
  }
}

function filterFromForm(value: OrganizationsFilterFormValue): Partial<OrganizationListFilter> {
  return {
    createdFrom: toDateOnly(value.createdFrom),
    createdTo: toDateOnly(value.createdTo),
  };
}

function toDateOnly(value: Date | null): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function filterSyncKey(filter: OrganizationListFilter): string {
  return JSON.stringify({ createdFrom: filter.createdFrom ?? null, createdTo: filter.createdTo ?? null });
}

function createdDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const createdFrom = control.get('createdFrom')?.value as Date | null;
  const createdTo = control.get('createdTo')?.value as Date | null;
  return createdFrom && createdTo && createdFrom > createdTo ? { createdDateRange: true } : null;
}

function endOfToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}

