import { computed, inject, Injectable, signal } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { UserListFilter } from '../models/users/users.models';
import { UsersStoreActions, UsersStoreSelectors } from '../../store/users';

/**
 * Сервис управления фильтрами списка пользователей.
 *
 * ПРИНЦИП: URL — единственный источник правды.
 * localStorage НЕ используется — он создавал race condition при F5.
 *
 * КАК РАБОТАЕТ F5:
 *   Браузер перезагружает тот же URL (например /users?page=2&pageSize=30&sortBy=name)
 *   → ngOnInit читает queryParams из URL → диспатчит loadUsers → всё восстанавливается.
 *
 * КАК РАБОТАЕТ СМЕНА ФИЛЬТРА:
 *   Пользователь меняет фильтр → applyFilter() → syncUrl() обновляет URL (replaceUrl: true)
 *   → Store обновляется → компонент рендерит новые данные.
 */
@Injectable()
export class UsersFilterService {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  readonly currentFilter = this.store.selectSignal(UsersStoreSelectors.getFilter);
  readonly isFilterOpen = signal(false);

  readonly activeFilterCount = computed(() => {
    const f = this.currentFilter();
    return [f.name, f.surname, f.email, f.userStatusId, f.createdFrom, f.createdTo].filter(
      (v) => v !== undefined && v !== null && v !== '',
    ).length;
  });

  /**
   * Инициализация из URL. Вызывается в ngOnInit компонента.
   * Если queryParams пустые — записывает дефолты в URL.
   */
  initFromUrl(): void {
    const params = this.route.snapshot.queryParams;

    const filter: UserListFilter = {
      page: params['page'] ? +params['page'] : 1,
      pageSize: params['pageSize'] ? +params['pageSize'] : 10,
      sortBy: params['sortBy'] ?? 'createdAt',
      sortDirection: params['sortDirection'] ? +params['sortDirection'] : 1,
      name: params['name'] ?? undefined,
      surname: params['surname'] ?? undefined,
      email: params['email'] ?? undefined,
      userStatusId: params['userStatusId'] ? +params['userStatusId'] : undefined,
      createdFrom: params['createdFrom'] ?? undefined,
      createdTo: params['createdTo'] ?? undefined,
    };

    this.store.dispatch(UsersStoreActions.setFilter({ filter }));
    this.store.dispatch(UsersStoreActions.loadUsers({ filter }));

    // Если URL был без параметров — записываем дефолты чтобы URL всегда был полным
    const hasParams = Object.keys(params).length > 0;
    if (!hasParams) {
      this.syncUrl(filter);
    }
  }

  /**
   * Применяет частичный фильтр поверх текущего.
   * По умолчанию сбрасывает страницу на 1 (resetPage=true).
   */
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
      name: undefined,
      surname: undefined,
      email: undefined,
      userStatusId: undefined,
      createdFrom: undefined,
      createdTo: undefined,
    });
  }

  /**
   * Обновляет URL без добавления записи в историю браузера (replaceUrl: true).
   * Это значит что кнопка "назад" не будет листать каждый клик по фильтру.
   * Только обязательные параметры всегда в URL, опциональные — только если заданы.
   */
  private syncUrl(filter: UserListFilter): void {
    const queryParams: Record<string, unknown> = {
      page: filter.page,
      pageSize: filter.pageSize,
      sortBy: filter.sortBy,
      sortDirection: filter.sortDirection,
    };

    if (filter.name) queryParams['name'] = filter.name;
    if (filter.surname) queryParams['surname'] = filter.surname;
    if (filter.email) queryParams['email'] = filter.email;
    if (filter.userStatusId) queryParams['userStatusId'] = filter.userStatusId;
    if (filter.createdFrom) queryParams['createdFrom'] = filter.createdFrom;
    if (filter.createdTo) queryParams['createdTo'] = filter.createdTo;

    void this.router.navigate(['/users'], {
      queryParams,
      replaceUrl: true, // не засоряем историю браузера
      queryParamsHandling: '', // полная замена params (не merge)
    });
  }
}
