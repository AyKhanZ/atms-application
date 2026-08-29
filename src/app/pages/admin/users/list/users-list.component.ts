import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { UserListFilter, UserListItemModel, createDefaultUserListFilter } from '../../../../core/models/users/users.models';
import { UsersStoreActions, UsersStoreSelectors } from '../../../../store/users';
import { UserStoreSelectors } from '../../../../store/user';
import { DictionaryStoreActions, DictionaryStoreSelectors } from '../../../../store/dictionary';
import { SortDirectionEnum } from '../../../../core/enums/sort-direction.enum';
import { UserDisplayService } from '../../../../core/services/user-display.service';
import { TableLazyLoadService } from '../../../../core/services/table-lazy-load.service';
import { UsersFilterComponent } from '../components/filter-users.component/filter-users.component';
import { UsersListQueryService } from './services/users-list-query.service';
import { ListSearchComponent } from '../../../../shared/components/list-search/list-search.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { CreateButtonComponent } from '../../../../shared/components/create-button/create-button.component';
import { UserRegisterDialogComponent } from '../components/user-register-dialog/user-register-dialog.component';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { Permissions } from '../../../../core/enums/permissions.enum';
import { ImageUrlService } from '../../../../core/services/image-url.service';

@Component({
  selector: 'app-users-list',
  imports: [
    CreateButtonComponent,
    DatePipe,
    FilterToggleButtonComponent,
    HasPermissionDirective,
    ListSearchComponent,
    TableModule,
    TagModule,
    UsersFilterComponent,
    UserRegisterDialogComponent,
  ],
  providers: [UsersListQueryService],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly userDisplay = inject(UserDisplayService);
  private readonly query = inject(UsersListQueryService);
  private readonly tableLazyLoad = inject(TableLazyLoadService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly searchChanges = new Subject<string>();
  private lastLoadKey = '';

  readonly hasLoaded = signal(false);
  readonly failedAvatarIds = signal<Set<string>>(new Set<string>());
  readonly users = this.store.selectSignal(UsersStoreSelectors.getItems);
  readonly totalCount = this.store.selectSignal(UsersStoreSelectors.getTotalCount);
  readonly loading = this.store.selectSignal(UsersStoreSelectors.isLoading);
  readonly userStatuses = this.store.selectSignal(DictionaryStoreSelectors.getUserStatusesDictionaries);
  readonly userStatusesLoading = this.store.selectSignal(
    DictionaryStoreSelectors.getUserStatusesDictionariesIsLoading,
  );
  readonly filter = signal<UserListFilter>(createDefaultUserListFilter());
  readonly searchTerm = signal('');
  readonly filtersOpen = signal(false);
  readonly registerDialogVisible = signal(false);
  readonly Permissions = Permissions;
  readonly first = computed(() => (this.filter().page - 1) * this.filter().pageSize);
  readonly activeFilterCount = computed(() => this.query.activeFilterCount(this.filter()));
  readonly tableRequestsBlocked = computed(() => {
    const filter = this.filter();
    const hasUserInput = Boolean(filter.search) || this.query.hasAdvancedFilters(filter);

    return this.hasLoaded() && !this.loading() && this.totalCount() === 0 && !hasUserInput;
  });
  readonly tableSortOrder = computed(() =>
    this.filter().sortDirection === SortDirectionEnum.Desc ? -1 : 1,
  );
  constructor() {
    if (this.userStatuses().length === 0) {
      this.store.dispatch(DictionaryStoreActions.loadUserStatusDictionaries());
    }

    this.searchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => {
        this.writeUrl({
          ...this.filter(),
          search: this.query.clean(search),
          page: 1,
        });
      });

    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const filter = this.query.fromParams(params);
      this.searchTerm.set(filter.search ?? '');
      if (this.query.hasAdvancedFilters(filter)) {
        this.filtersOpen.set(true);
      }

      this.filter.set(filter);
      this.loadUsers(filter);
    });
  }

  ngOnInit(): void {
    if (Object.keys(this.route.snapshot.queryParams).length === 0) {
      this.writeUrl(createDefaultUserListFilter());
    }
  }

  ngOnDestroy(): void {
    this.store.dispatch(UsersStoreActions.clearAll());
  }

  applyFilters(filter: Partial<UserListFilter>): void {
    this.writeUrl({
      ...this.filter(),
      ...filter,
      page: 1,
    });
  }

  clearFilters(): void {
    this.writeUrl({
      ...createDefaultUserListFilter(),
      search: this.filter().search,
    });
  }

  toggleFilters(): void {
    this.filtersOpen.update((isOpen) => !isOpen);
  }

  openRegisterUser(): void {
    this.registerDialogVisible.set(true);
  }

  onUserRegistered(): void {
    this.lastLoadKey = '';
    this.loadUsers(this.filter());
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.tableRequestsBlocked()) {
      return;
    }

    this.writeUrl(this.tableLazyLoad.toFilter(event, this.filter()));
  }

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.searchChanges.next(search);
  }

  userStatus(user: UserListItemModel): string {
    return this.userDisplay.status(user);
  }

  fullName(user: UserListItemModel): string {
    return this.userDisplay.fullName(user);
  }

  initials(user: UserListItemModel): string {
    return this.userDisplay.initials(user);
  }

  avatarLoadFailed(user: UserListItemModel): boolean {
    return this.failedAvatarIds().has(user.id);
  }

  avatarUrl(user: UserListItemModel): string | null {
    return this.imageUrlService.normalize(user.avatarPath);
  }

  onAvatarError(user: UserListItemModel): void {
    this.failedAvatarIds.update((ids) => new Set(ids).add(user.id));
  }

  openDetails(user: UserListItemModel): void {
    void this.router.navigate([user.id], {
      relativeTo: this.route,
      state: { returnUrl: this.router.url },
    });
  }

  private loadUsers(filter: UserListFilter): void {
    const key = JSON.stringify(this.query.toParams(filter));
    if (key === this.lastLoadKey) {
      return;
    }

    this.lastLoadKey = key;
    this.hasLoaded.set(true);
    this.store.dispatch(UsersStoreActions.loadUsers({ filter }));
  }

  private writeUrl(filter: UserListFilter): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.query.toParams(filter),
      replaceUrl: true,
    });
  }
}

