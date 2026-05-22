import { Component, computed, inject, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import { UsersStoreSelectors } from '../../../../store/users';
import { DictionaryStoreActions } from '../../../../store/dictionary';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, NgClass } from '@angular/common';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { UsersFilterService } from '../../../../core/services/users-filter.service';
import { UsersFilterComponent } from '../components/filter-users.component/filter-users.component';

const SORT_OPTIONS = [
  { label: 'Name', value: 'name' },
  { label: 'Surname', value: 'surname' },
  { label: 'Email', value: 'email' },
  { label: 'Status', value: 'userStatus' },
  { label: 'Created At', value: 'createdAt' },
] as const;

@Component({
  selector: 'app-users-list',
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatBadgeModule,
    MatTooltipModule,
    DatePipe,
    NgClass,
    PaginationComponent,
    UsersFilterComponent,
  ],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly filterService = inject(UsersFilterService);

  readonly users = this.store.selectSignal(UsersStoreSelectors.getItems);
  readonly isLoading = this.store.selectSignal(UsersStoreSelectors.isLoading);
  readonly totalCount = this.store.selectSignal(UsersStoreSelectors.getTotalCount);
  readonly totalPages = this.store.selectSignal(UsersStoreSelectors.getTotalPages);
  readonly filter = this.filterService.currentFilter;
  readonly activeFilterCount = this.filterService.activeFilterCount;
  readonly isFilterOpen = this.filterService.isFilterOpen;

  readonly sortOptions = SORT_OPTIONS;
  readonly displayedColumns = ['fullName', 'email', 'position', 'userStatus', 'createdAt'];

  readonly currentSortLabel = computed(() => {
    const f = this.filter();
    return this.sortOptions.find((s) => s.value === f.sortBy)?.label ?? 'Sort';
  });

  readonly sortDirectionIcon = computed(() =>
    this.filter().sortDirection === 1 ? 'arrow_upward' : 'arrow_downward',
  );

  ngOnInit(): void {
    this.store.dispatch(DictionaryStoreActions.loadUserStatusDictionaries());

    /**
     * Единственный источник правды — URL.
     * initFromUrl() читает queryParams из адресной строки.
     *
     * При F5: браузер восстанавливает URL → initFromUrl читает те же params →
     *         те же фильтры → тот же запрос. Всё работает без localStorage.
     *
     * При первом входе (URL без params): initFromUrl запишет дефолты в URL,
     *         URL станет /users?page=1&pageSize=10&sortBy=createdAt&sortDirection=1
     */
    this.filterService.initFromUrl();
  }

  toggleFilter(): void {
    this.filterService.toggleFilter();
  }

  setSort(sortBy: string): void {
    const current = this.filter();
    const direction = current.sortBy === sortBy ? (current.sortDirection === 1 ? 2 : 1) : 1;
    this.filterService.setSort(sortBy, direction);
  }

  onPageChange(page: number): void {
    this.filterService.setPage(page);
  }

  onPageSizeChange(pageSize: number): void {
    this.filterService.setPageSize(pageSize);
  }

  getStatusClass(statusId: number): string {
    const map: Record<number, string> = {
      1: 'status--active',
      2: 'status--inactive',
      3: 'status--pending',
    };
    return map[statusId] ?? 'status--default';
  }
}
