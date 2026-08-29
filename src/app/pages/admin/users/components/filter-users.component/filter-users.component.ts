import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { UserListFilter } from '../../../../../core/models/users/users.models';
import { ClearButtonComponent } from '../../../../../shared/components/clear-button/clear-button.component';

export interface UsersFilterFormValue {
  userStatusId: number | null;
  createdFrom: Date | null;
  createdTo: Date | null;
}

type StatusOption = Pick<DictionaryModel, 'name' | 'code'> & { id: number | null };

@Component({
  selector: 'app-users-filter',
  imports: [
    ReactiveFormsModule,
    ClearButtonComponent,
    DatePickerModule,
    InputTextModule,
    SelectModule,
  ],
  templateUrl: './filter-users.component.html',
  styleUrl: './filter-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersFilterComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private syncedFilterKey = '';
  readonly today = endOfToday();

  readonly filter = input.required<UserListFilter>();
  readonly statuses = input.required<DictionaryModel[]>();
  readonly statusesLoading = input(false);
  readonly apply = output<Partial<UserListFilter>>();
  readonly clear = output<void>();

  readonly statusOptions = computed<StatusOption[]>(() => [
    { id: null, name: 'Any status', code: '' },
    ...this.statuses().map((status) => ({
      ...status,
      id: Number(status.id),
    })),
  ]);

  readonly form = this.fb.group(
    {
      userStatusId: this.fb.control<number | null>(null),
      createdFrom: this.fb.control<Date | null>(null),
      createdTo: this.fb.control<Date | null>(null),
    },
    { validators: createdDateRangeValidator },
  );

  constructor() {
    effect(() => {
      const statusControl = this.form.controls.userStatusId;
      if (this.statusesLoading()) {
        statusControl.disable({ emitEvent: false });
      } else {
        statusControl.enable({ emitEvent: false });
      }
    });

    effect(() => {
      const filter = this.filter();
      const filterKey = filterSyncKey(filter);
      if (filterKey === this.syncedFilterKey) {
        return;
      }

      this.form.patchValue(
        {
          userStatusId: filter.userStatusId ?? null,
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
    this.form.reset({
      userStatusId: null,
      createdFrom: null,
      createdTo: null,
    });
    this.clear.emit();
  }
}

function filterFromForm(value: UsersFilterFormValue): Partial<UserListFilter> {
  return {
    userStatusId: value.userStatusId ?? undefined,
    createdFrom: toDateOnly(value.createdFrom),
    createdTo: toDateOnly(value.createdTo),
  };
}

function toDateOnly(value: Date | null): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function filterSyncKey(filter: UserListFilter): string {
  return JSON.stringify({
    userStatusId: filter.userStatusId ?? null,
    createdFrom: filter.createdFrom ?? null,
    createdTo: filter.createdTo ?? null,
  });
}

function createdDateRangeValidator(control: AbstractControl): ValidationErrors | null {
  const createdFrom = control.get('createdFrom')?.value as Date | null;
  const createdTo = control.get('createdTo')?.value as Date | null;

  if (createdFrom && createdTo && createdFrom > createdTo) {
    return { createdDateRange: true };
  }

  return null;
}

function endOfToday(): Date {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
}
