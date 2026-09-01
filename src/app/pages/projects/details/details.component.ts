import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { HasProjectAccessDirective } from '../../../core/directives/has-project-access.directive';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { Permissions } from '../../../core/enums/permissions.enum';
import { ProjectPermissions } from '../../../core/enums/project-permissions.enum';
import { Roles } from '../../../core/enums/roles.enum';
import { BreadcrumbOverrideService } from '../../../core/services/breadcrumb-override.service';
import { ProjectPermissionsRefreshService } from '../../../core/services/project-permissions-refresh.service';
import { projectNavigationUrl } from '../../../core/utils/project-navigation.utils';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../../shared/components/entity-tabs/entity-tabs.component';
import { PersonNamePipe } from '../../../shared/pipes/person-name.pipe';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { WorkProjectsStoreActions, WorkProjectsStoreSelectors } from '../../../store/work-projects';
import { ProjectStatusBadgeComponent } from '../components/status-badge/project-status-badge.component';
import { GroupsTabComponent } from './tabs/groups/groups-tab.component';
import { WorkGroupExpansionStateService } from './tabs/groups/work-group-expansion-state.service';
import { StakeholdersTabComponent } from './tabs/stakeholders/stakeholders-tab.component';

type ProjectTab = 'details' | 'stakeholders' | 'groups' | 'attachments' | 'history';

@Component({
  selector: 'app-project-details',
  imports: [
    DatePipe,
    ButtonModule,
    ConfirmDialogModule,
    HasProjectAccessDirective,
    HasRoleDirective,
    BackButtonComponent,
    EmptyStateComponent,
    EntityTabsComponent,
    ProjectStatusBadgeComponent,
    GroupsTabComponent,
    StakeholdersTabComponent,
    PersonNamePipe,
    RelativeTimePipe,
  ],
  providers: [ConfirmationService, WorkGroupExpansionStateService],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(ConfirmationService);
  private readonly workGroupExpansionState = inject(WorkGroupExpansionStateService);
  private readonly projectPermissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private breadcrumbPath = '';

  readonly project = this.store.selectSignal(WorkProjectsStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(WorkProjectsStoreSelectors.isLoading);
  readonly isSaving = this.store.selectSignal(WorkProjectsStoreSelectors.isSubmitted);
  readonly projectPermissions = signal<string[]>([]);
  readonly Permissions = Permissions;
  readonly ProjectPermissions = ProjectPermissions;
  readonly Roles = Roles;
  readonly activeTab = signal<ProjectTab>('details');
  /** Plan is only offered to people who can see it, so the strip mirrors the old *hasProjectAccess. */
  readonly tabs = computed<EntityTab<ProjectTab>[]>(() => [
    { id: 'details', label: 'Details', icon: 'pi-align-left' },
    { id: 'stakeholders', label: 'Stakeholders', icon: 'pi-users' },
    ...(this.projectPermissions().includes(ProjectPermissions.Project.View)
      ? ([{ id: 'groups', label: 'Plan', icon: 'pi-list-check' }] as EntityTab<ProjectTab>[])
      : []),
    { id: 'attachments', label: 'Attachments', icon: 'pi-paperclip' },
    { id: 'history', label: 'History', icon: 'pi-history' },
  ]);
  readonly focusedMilestoneId = signal<string | null>(null);
  readonly id = this.route.snapshot.paramMap.get('projectId') ?? '';

  constructor() {
    this.breadcrumbPath = `/projects/${this.id}`;
    // Placeholder so the trail does not visibly grow a segment once the project loads.
    this.breadcrumbOverride.set(this.breadcrumbPath, 'Project');
    effect(() => {
      const project = this.project();
      if (project) this.breadcrumbOverride.set(this.breadcrumbPath, `#${project.code} ${project.title}`);
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.activeTab.set(parseProjectTab(params.get('tab')));
      const groupId = params.get('groupId');
      this.focusedMilestoneId.set(params.get('milestoneId'));
      if (groupId) this.workGroupExpansionState.set(this.id, new Set([groupId]));
    });
    this.projectPermissionsRefresh.watch(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (permissions) => {
          if (!permissions.includes(ProjectPermissions.Project.View)) {
            void this.router.navigate(['/errors/403']);
            return;
          }

          this.projectPermissions.set(permissions);
          if (
            this.activeTab() === 'groups' &&
            !permissions.includes(ProjectPermissions.Project.View)
          ) {
            this.selectTab('details');
          }

          this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id }));
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 403 || error.status === 404)) {
            void this.router.navigate(['/errors/403']);
          }
        },
      });
    this.actions$
      .pipe(
        ofType(
          WorkProjectsStoreActions.updateProjectSuccess,
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
    this.breadcrumbOverride.clear(this.breadcrumbPath);
  }

  selectTab(tab: ProjectTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: projectTabQueryParam(tab) },
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

export function parseProjectTab(value: string | null): ProjectTab {
  if (value === 'plan' || value === 'links') return 'groups';

  return value === 'stakeholders' || value === 'attachments' || value === 'history'
    ? value
    : 'details';
}

export function projectTabQueryParam(tab: ProjectTab): string | null {
  if (tab === 'details') return null;

  return tab === 'groups' ? 'plan' : tab;
}

