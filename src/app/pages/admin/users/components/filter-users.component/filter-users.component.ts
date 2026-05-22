import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserListFilter } from '../../../../../core/models/users/users.models';
import { Store } from '@ngrx/store';
import { UsersFilterService } from '../../../../../core/services/users-filter.service';
import { DictionaryStoreSelectors } from '../../../../../store/dictionary';

@Component({
  selector: 'app-users-filter',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
  ],
  templateUrl: './filter-users.component.html',
  styleUrl: './filter-users.component.scss',
})
export class UsersFilterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly filterService = inject(UsersFilterService);

  readonly statuses = this.store.selectSignal(DictionaryStoreSelectors.getUserStatusesDictionaries);
  readonly isOpen = this.filterService.isFilterOpen;

  form = this.fb.group({
    name: [''],
    surname: [''],
    email: [''],
    userStatusId: [null as number | null],
    createdFrom: [null as Date | null],
    createdTo: [null as Date | null],
  });

  ngOnInit(): void {
    const f = this.filterService.currentFilter();
    this.form.patchValue({
      name: f.name ?? '',
      surname: f.surname ?? '',
      email: f.email ?? '',
      userStatusId: f.userStatusId ?? null,
      createdFrom: f.createdFrom ? new Date(f.createdFrom) : null,
      createdTo: f.createdTo ? new Date(f.createdTo) : null,
    });
  }

  onSubmit(): void {
    const v = this.form.value;
    const partial: Partial<UserListFilter> = {
      name: v.name || undefined,
      surname: v.surname || undefined,
      email: v.email || undefined,
      userStatusId: v.userStatusId ?? undefined,
      createdFrom: v.createdFrom ? v.createdFrom.toISOString().split('T')[0] : undefined,
      createdTo: v.createdTo ? v.createdTo.toISOString().split('T')[0] : undefined,
    };
    this.filterService.applyFilter(partial);
    this.filterService.closeFilter();
  }

  onCancel(): void {
    this.form.reset();
    this.filterService.clearFilter();
    this.filterService.closeFilter();
  }
}
