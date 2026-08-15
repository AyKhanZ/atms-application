import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { forkJoin } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { Roles } from '../../../core/enums/roles.enum';
import { DictionaryService } from '../../../core/services/dictionary.service';
import { UserStoreSelectors } from '../../../store/user';
import { WorkProjectsStoreActions, WorkProjectsStoreSelectors } from '../../../store/work-projects';

@Component({
  selector: 'app-project-details',
  imports: [DatePipe, FormsModule, ButtonModule, ConfirmDialogModule, SelectModule],
  providers: [ConfirmationService],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly confirmation = inject(ConfirmationService);
  private readonly dictionaryService = inject(DictionaryService);

  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);

  readonly project = this.store.selectSignal(WorkProjectsStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(WorkProjectsStoreSelectors.isLoading);
  readonly isSaving = this.store.selectSignal(WorkProjectsStoreSelectors.isSubmitted);
  readonly canManage = computed(() => this.roles().some((role) => role.code === Roles.SuperAdmin));
  readonly activeTab = signal<'details' | 'links'>('details');
  readonly types = signal<DictionaryModel[]>([]);
  readonly kinds = signal<DictionaryModel[]>([]);
  readonly statuses = signal<DictionaryModel[]>([]);
  readonly id = this.route.snapshot.paramMap.get('id')!;

  constructor() {
    this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id }));
    forkJoin({
      types: this.dictionaryService.getProjectTypeDictionaries(),
      kinds: this.dictionaryService.getProjectKindDictionaries(),
      statuses: this.dictionaryService.getProjectStatusDictionaries(),
    })
      .pipe(takeUntilDestroyed())
      .subscribe((result) => {
        this.types.set(result.types);
        this.kinds.set(result.kinds);
        this.statuses.set(result.statuses);
      });
    this.actions$
      .pipe(
        ofType(
          WorkProjectsStoreActions.updateProjectSuccess,
          WorkProjectsStoreActions.updateProjectStatusSuccess,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id })));
    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.deleteProjectSuccess), takeUntilDestroyed())
      .subscribe(() => this.back());
  }

  ngOnDestroy(): void {
    this.store.dispatch(WorkProjectsStoreActions.clearItem());
  }
  back(): void {
    void this.router.navigateByUrl(history.state?.returnUrl || '/projects');
  }
  edit(): void {
    void this.router.navigate(['/projects', this.id, 'edit'], {
      state: { returnUrl: `/projects/${this.id}` },
    });
  }
  changeStatus(projectStatusId: number): void {
    const project = this.project();
    if (!project || project.projectStatus.id === projectStatusId) return;
    this.store.dispatch(
      WorkProjectsStoreActions.updateProjectStatus({ id: project.id, projectStatusId }),
    );
  }
  confirmDelete(): void {
    const project = this.project();
    if (!project) return;
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
}
