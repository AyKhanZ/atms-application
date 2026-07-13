import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Permissions } from '../../../../core/enums/permissions.enum';
import { createDefaultOrganizationListFilter, OrganizationListFilter, OrganizationListItemModel } from '../../../../core/models/organizations/organizations.models';
import { SortDirectionEnum } from '../../../../core/enums/sort-direction.enum';
import { TableLazyLoadService } from '../../../../core/services/table-lazy-load.service';
import { ImageUrlService } from '../../../../core/services/image-url.service';
import { OrganizationsStoreActions, OrganizationsStoreSelectors } from '../../../../store/organizations';
import { UserStoreSelectors } from '../../../../store/user';
import { ListSearchComponent } from '../../../../shared/components/list-search/list-search.component';
import { FilterToggleButtonComponent } from '../../../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { CreateButtonComponent } from '../../../../shared/components/create-button/create-button.component';
import { EditActionButtonComponent } from '../../../../shared/components/edit-action-button/edit-action-button.component';
import { DeleteActionButtonComponent } from '../../../../shared/components/delete-action-button/delete-action-button.component';
import { OrganizationsFilterComponent } from '../components/filter-organizations.component/filter-organizations.component';
import { OrganizationCreateDialogComponent } from '../components/organization-create-dialog/organization-create-dialog.component';
import { OrganizationsListQueryService } from './services/organizations-list-query.service';

@Component({
  selector: 'app-organizations-list',
  imports: [
    ConfirmDialogModule,
    CreateButtonComponent,
    DatePipe,
    DeleteActionButtonComponent,
    EditActionButtonComponent,
    FilterToggleButtonComponent,
    ListSearchComponent,
    OrganizationsFilterComponent,
    OrganizationCreateDialogComponent,
    TableModule,
  ],
  providers: [ConfirmationService, OrganizationsListQueryService],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly query = inject(OrganizationsListQueryService);
  private readonly tableLazyLoad = inject(TableLazyLoadService);
  private readonly imageUrlService = inject(ImageUrlService);
  private readonly searchChanges = new Subject<string>();
  private readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);
  private lastLoadKey = '';

  readonly hasLoaded = signal(false);
  readonly organizations = this.store.selectSignal(OrganizationsStoreSelectors.getItems);
  readonly totalCount = this.store.selectSignal(OrganizationsStoreSelectors.getTotalCount);
  readonly loading = this.store.selectSignal(OrganizationsStoreSelectors.isLoading);
  readonly filter = signal<OrganizationListFilter>(createDefaultOrganizationListFilter());
  readonly searchTerm = signal('');
  readonly filtersOpen = signal(false);
  readonly createDialogVisible = signal(false);
  readonly selectedOrganization = signal<OrganizationListItemModel | null>(null);
  readonly first = computed(() => (this.filter().page - 1) * this.filter().pageSize);
  readonly activeFilterCount = computed(() => this.query.activeFilterCount(this.filter()));
  readonly canEdit = computed(() => this.permissions().includes(Permissions.Organization.Edit));
  readonly canDelete = computed(() => this.permissions().includes(Permissions.Organization.Delete));
  readonly showActions = computed(() => this.canEdit() || this.canDelete());
  readonly tableRequestsBlocked = computed(() => {
    const filter = this.filter();
    const hasUserInput = Boolean(filter.search) || this.query.hasAdvancedFilters(filter);
    return this.hasLoaded() && !this.loading() && this.totalCount() === 0 && !hasUserInput;
  });
  readonly tableSortOrder = computed(() => this.filter().sortDirection === SortDirectionEnum.Desc ? -1 : 1);

  constructor() {
    this.searchChanges.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed()).subscribe((search) => {
      this.writeUrl({ ...this.filter(), search: this.query.clean(search), page: 1 });
    });

    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const filter = this.query.fromParams(params);
      this.searchTerm.set(filter.search ?? '');
      if (this.query.hasAdvancedFilters(filter)) this.filtersOpen.set(true);
      this.filter.set(filter);
      this.loadOrganizations(filter);
    });
  }

  ngOnInit(): void {
    if (Object.keys(this.route.snapshot.queryParams).length === 0) this.writeUrl(createDefaultOrganizationListFilter());
  }

  ngOnDestroy(): void {
    this.store.dispatch(OrganizationsStoreActions.clearAll());
  }

  applyFilters(filter: Partial<OrganizationListFilter>): void {
    this.writeUrl({ ...this.filter(), ...filter, page: 1 });
  }

  clearFilters(): void {
    this.writeUrl({ ...createDefaultOrganizationListFilter(), search: this.filter().search });
  }

  toggleFilters(): void {
    this.filtersOpen.update((isOpen) => !isOpen);
  }

  openCreateOrganization(): void {
    this.selectedOrganization.set(null);
    this.createDialogVisible.set(true);
  }

  openEditOrganization(organization: OrganizationListItemModel): void {
    this.selectedOrganization.set(organization);
    this.createDialogVisible.set(true);
  }

  confirmDeleteOrganization(organization: OrganizationListItemModel): void {
    this.confirmationService.confirm({
      header: 'Delete organization',
      message: `Are you sure you want to delete ${organization.title}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => this.store.dispatch(OrganizationsStoreActions.deleteOrganization({ id: organization.id })),
    });
  }

  onOrganizationSaved(): void {
    this.selectedOrganization.set(null);
    this.lastLoadKey = '';
    this.loadOrganizations(this.filter());
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    if (this.tableRequestsBlocked()) return;
    this.writeUrl(this.tableLazyLoad.toFilter(event, this.filter()));
  }

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.searchChanges.next(search);
  }

  initials(organization: OrganizationListItemModel): string {
    return organization.title.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'O';
  }

  logoUrl(organization: OrganizationListItemModel): string | null {
    return this.imageUrlService.normalize(organization.logoPath);
  }

  displayCreatedAt(organization: OrganizationListItemModel): string | null {
    return organization.createdAt && !organization.createdAt.startsWith('0001-') ? organization.createdAt : null;
  }

  openDetails(organization: OrganizationListItemModel): void {
    void this.router.navigate([organization.id], { relativeTo: this.route, state: { returnUrl: this.router.url } });
  }

  private loadOrganizations(filter: OrganizationListFilter): void {
    const key = JSON.stringify(this.query.toParams(filter));
    if (key === this.lastLoadKey) return;
    this.lastLoadKey = key;
    this.hasLoaded.set(true);
    this.store.dispatch(OrganizationsStoreActions.loadOrganizations({ filter }));
  }

  private writeUrl(filter: OrganizationListFilter): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: this.query.toParams(filter), replaceUrl: true });
  }
}
