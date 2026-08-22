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
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { UserStoreSelectors } from '../../../store/user';
import { WorkProjectsStoreActions, WorkProjectsStoreSelectors } from '../../../store/work-projects';
import { ProjectStakeholdersComponent } from './components/project-stakeholders/project-stakeholders.component';

type ProjectTab = 'details' | 'stakeholders' | 'links' | 'attachments' | 'history';

@Component({
  selector: 'app-project-details',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    SelectModule,
    BackButtonComponent,
    ProjectStakeholdersComponent,
  ],
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
  readonly activeTab = signal<ProjectTab>('details');
  readonly types = signal<DictionaryModel[]>([]);
  readonly kinds = signal<DictionaryModel[]>([]);
  readonly statuses = signal<DictionaryModel[]>([]);
  readonly commentDraft = signal('');
  readonly previewComments = signal<string[]>([]);
  readonly id = this.route.snapshot.paramMap.get('id')!;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.activeTab.set(parseProjectTab(params.get('tab')));
    });
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
          WorkProjectsStoreActions.addProjectParticipantSuccess,
          WorkProjectsStoreActions.updateProjectParticipantSuccess,
          WorkProjectsStoreActions.deleteProjectParticipantSuccess,
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

  selectTab(tab: ProjectTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'details' ? null : tab },
      queryParamsHandling: 'merge',
    });
  }

  back(): void {
    const state = history.state as { returnUrl?: unknown };
    void this.router.navigateByUrl(projectNavigationUrl(state.returnUrl) ?? '/projects');
  }

  edit(): void {
    const state = history.state as { returnUrl?: unknown };
    const detailsReturnUrl = projectNavigationUrl(state.returnUrl) ?? '/projects';
    void this.router.navigate(['/projects', this.id, 'edit'], {
      state: { cancelUrl: this.router.url, detailsReturnUrl },
    });
  }

  changeStatus(projectStatusId: number): void {
    const project = this.project();
    if (!project || project.projectStatus.id === projectStatusId) return;
    this.store.dispatch(
      WorkProjectsStoreActions.updateProjectStatus({ id: project.id, projectStatusId }),
    );
  }

  sendComment(): void {
    const comment = this.commentDraft().trim();
    if (!comment) return;
    this.previewComments.update((comments) => [...comments, comment]);
    this.commentDraft.set('');
  }

  showUnavailable(feature: string): void {
    this.confirmation.confirm({
      header: feature,
      message: 'This action is not available yet.',
      acceptLabel: 'Close',
      rejectVisible: false,
    });
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

  updatedLabel(updatedAt?: string | null): string {
    if (!updatedAt) return '';
    const updated = new Date(updatedAt);
    const seconds = Math.round((updated.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (Math.abs(seconds) < 60) return formatter.format(seconds, 'second');
    const minutes = Math.round(seconds / 60);
    if (Math.abs(minutes) < 60) return formatter.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return formatter.format(hours, 'hour');
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return formatter.format(days, 'day');
    return updated.toLocaleDateString('en-GB');
  }
}

export function parseProjectTab(value: string | null): ProjectTab {
  return value === 'stakeholders' ||
    value === 'links' ||
    value === 'attachments' ||
    value === 'history'
    ? value
    : 'details';
}

function projectNavigationUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value === '/projects' || value.startsWith('/projects?') || value.startsWith('/projects/')
    ? value
    : null;
}
