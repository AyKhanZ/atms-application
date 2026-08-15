import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, forkJoin, Subject } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import {
  createDefaultWorkProjectListFilter,
  WorkProjectItemModel,
  WorkProjectListFilter,
  WorkProjectModel,
} from '../../../core/models/work-projects';
import { Roles } from '../../../core/enums/roles.enum';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { TableLazyLoadService } from '../../../core/services/table-lazy-load.service';
import { WorkProjectsService } from '../../../core/services/work-projects.service';
import { CreateButtonComponent } from '../../../shared/components/create-button/create-button.component';
import { DeleteActionButtonComponent } from '../../../shared/components/delete-action-button/delete-action-button.component';
import { EditActionButtonComponent } from '../../../shared/components/edit-action-button/edit-action-button.component';
import { FilterToggleButtonComponent } from '../../../shared/components/filter-toggle-button/filter-toggle-button.component';
import { ListSearchComponent } from '../../../shared/components/list-search/list-search.component';
import { UserStoreSelectors } from '../../../store/user';
import { WorkProjectsStoreActions, WorkProjectsStoreSelectors } from '../../../store/work-projects';
import { ProjectFilterComponent } from '../components/filter/filter.component';
import { ProjectFormDialogComponent } from '../components/form-dialog/form-dialog.component';
import { ProjectListQueryService } from './services/list-query.service';

@Component({
  selector: 'app-project-list',
  imports: [
    DatePipe,
    ConfirmDialogModule,
    TableModule,
    CreateButtonComponent,
    DeleteActionButtonComponent,
    EditActionButtonComponent,
    FilterToggleButtonComponent,
    ListSearchComponent,
    ProjectFilterComponent,
    ProjectFormDialogComponent,
  ],
  providers: [ConfirmationService, ProjectListQueryService],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);
  private readonly query = inject(ProjectListQueryService);
  private readonly tableLazyLoad = inject(TableLazyLoadService);
  private readonly dictionaryService = inject(DictionaryService);
  private readonly service = inject(WorkProjectsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);

  private lastLoadKey = '';

  readonly projects = this.store.selectSignal(WorkProjectsStoreSelectors.getItems);
  readonly totalCount = this.store.selectSignal(WorkProjectsStoreSelectors.getTotalCount);
  readonly loading = this.store.selectSignal(WorkProjectsStoreSelectors.isLoading);
  readonly filter = signal(createDefaultWorkProjectListFilter());
  readonly searchTerm = signal('');
  readonly filtersOpen = signal(false);
  readonly dialogVisible = signal(false);
  readonly selectedProject = signal<WorkProjectModel | null>(null);
  readonly types = signal<DictionaryModel[]>([]);
  readonly kinds = signal<DictionaryModel[]>([]);
  readonly statuses = signal<DictionaryModel[]>([]);
  readonly canManage = computed(() => this.roles().some((role) => role.code === Roles.SuperAdmin));
  readonly first = computed(() => (this.filter().page - 1) * this.filter().pageSize);
  readonly activeFilterCount = computed(() => this.query.activeFilterCount(this.filter()));

  constructor() {
    this.searchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) =>
        this.writeUrl({ ...this.filter(), search: this.query.clean(search), page: 1 }),
      );
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const filter = this.query.fromParams(params);
      this.filter.set(filter);
      this.searchTerm.set(filter.search ?? '');
      if (this.query.hasAdvancedFilters(filter)) this.filtersOpen.set(true);
      this.load(filter);
    });
    forkJoin({
      types: this.dictionaryService.getProjectTypeDictionaries(),
      kinds: this.dictionaryService.getProjectKindDictionaries(),
      statuses: this.dictionaryService.getProjectStatusDictionaries(),
    })
      .pipe(takeUntilDestroyed())
      .subscribe(({ types, kinds, statuses }) => {
        this.types.set(types);
        this.kinds.set(kinds);
        this.statuses.set(statuses);
      });
  }

  ngOnDestroy(): void {
    this.store.dispatch(WorkProjectsStoreActions.clearAll());
  }
  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.searchChanges.next(value);
  }
  toggleFilters(): void {
    this.filtersOpen.update((value) => !value);
  }
  applyFilters(filter: Partial<WorkProjectListFilter>): void {
    this.writeUrl({ ...this.filter(), ...filter, page: 1 });
  }
  clearFilters(): void {
    this.writeUrl({ ...createDefaultWorkProjectListFilter(), search: this.filter().search });
  }
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.writeUrl(this.tableLazyLoad.toFilter(event, this.filter()));
  }
  openCreate(): void {
    void this.router.navigate(['create'], { relativeTo: this.route });
  }
  openDetails(project: WorkProjectItemModel): void {
    void this.router.navigate([project.id], {
      relativeTo: this.route,
      state: { returnUrl: this.router.url },
    });
  }
  openEdit(project: WorkProjectItemModel): void {
    this.service
      .getProject(project.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((item) => {
        this.selectedProject.set(item);
        this.dialogVisible.set(true);
      });
  }
  confirmDelete(project: WorkProjectItemModel): void {
    this.confirmation.confirm({
      header: 'Delete project',
      message: `Are you sure you want to delete ${project.title}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Yes',
      rejectLabel: 'No',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => this.store.dispatch(WorkProjectsStoreActions.deleteProject({ id: project.id })),
    });
  }
  onSaved(): void {
    this.lastLoadKey = '';
    this.load(this.filter());
  }

  private load(filter: WorkProjectListFilter): void {
    const key = JSON.stringify(this.query.toParams(filter));
    if (key === this.lastLoadKey) return;
    this.lastLoadKey = key;
    this.store.dispatch(WorkProjectsStoreActions.loadProjects({ filter }));
  }
  private writeUrl(filter: WorkProjectListFilter): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.query.toParams(filter),
      replaceUrl: true,
    });
  }
}
