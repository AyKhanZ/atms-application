import { computed, inject, Injectable, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserListFilter } from '../models/users/users.models';
import { UsersStoreActions, UsersStoreSelectors } from '../../store/users';

// url is the only source of truth, no localStorage (it raced on F5)
@Injectable()
export class UsersFilterService {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  readonly currentFilter = this.store.selectSignal(UsersStoreSelectors.getFilter);
  readonly isFilterOpen = signal(false);

  readonly activeFilterCount = computed(() => {
    const f = this.currentFilter();
    return [f.search, f.userStatusId, f.createdFrom, f.createdTo].filter(
      (v) => v !== undefined && v !== null && v !== '',
    ).length;
  });

  initFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    const filter: UserListFilter = {
      page: params['page'] ? +params['page'] : 1,
      pageSize: params['pageSize'] ? +params['pageSize'] : 10,
      sortBy: params['sortBy'] ?? 'createdAt',
      sortDirection: params['sortDirection'] ? +params['sortDirection'] : 1,
      search: params['search'] ?? undefined,
      userStatusId: params['userStatusId'] ? +params['userStatusId'] : undefined,
      createdFrom: params['createdFrom'] ?? undefined,
      createdTo: params['createdTo'] ?? undefined,
    };

    this.store.dispatch(UsersStoreActions.setFilter({ filter }));
    this.store.dispatch(UsersStoreActions.loadUsers({ filter }));

    // url without params -> write defaults, so the url is always full
    const hasParams = Object.keys(params).length > 0;
    if (!hasParams) {
      this.syncUrl(filter);
    }
  }

  // resets to page 1 by default
  applyFilter(partial: Partial<UserListFilter>, resetPage = true): void {
    const current = this.currentFilter();
    const updated: UserListFilter = {
      ...current,
      ...partial,
      ...(resetPage ? { page: 1 } : {}),
    };

    this.store.dispatch(UsersStoreActions.setFilter({ filter: updated }));
    this.store.dispatch(UsersStoreActions.loadUsers({ filter: updated }));
    this.syncUrl(updated);
  }

  setSort(sortBy: string, sortDirection: number): void {
    this.applyFilter({ sortBy, sortDirection }, false);
  }

  setPage(page: number): void {
    this.applyFilter({ page }, false);
  }

  setPageSize(pageSize: number): void {
    this.applyFilter({ pageSize, page: 1 });
  }

  toggleFilter(): void {
    this.isFilterOpen.update((v) => !v);
  }

  closeFilter(): void {
    this.isFilterOpen.set(false);
  }

  clearFilter(): void {
    this.applyFilter({
      search: undefined,
      userStatusId: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    });
  }

  // replaceUrl so Back doesnt walk through every filter click
  private syncUrl(filter: UserListFilter): void {
    const queryParams: Record<string, unknown> = {
      page: filter.page,
      pageSize: filter.pageSize,
      sortBy: filter.sortBy,
      sortDirection: filter.sortDirection,
    };

    if (filter.search) queryParams['search'] = filter.search;
    if (filter.userStatusId) queryParams['userStatusId'] = filter.userStatusId;
    if (filter.createdFrom) queryParams['createdFrom'] = filter.createdFrom;
    if (filter.createdTo) queryParams['createdTo'] = filter.createdTo;

    void this.router.navigate(['/users'], {
      queryParams,
      replaceUrl: true,
      queryParamsHandling: '', // replace params, dont merge
    });
  }
}
