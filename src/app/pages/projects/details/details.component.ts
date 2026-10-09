import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
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
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { currentLanguage } from '../../../core/i18n/active-language';
import { HasProjectAccessDirective } from '../../../core/directives/has-project-access.directive';
import { HasRoleDirective } from '../../../core/directives/has-role.directive';
import { Permissions } from '../../../core/enums/permissions.enum';
import { ProjectPermissions } from '../../../core/enums/project-permissions.enum';
import { Roles } from '../../../core/enums/roles.enum';
import { BreadcrumbOverrideService } from '../../../core/services/breadcrumb-override.service';
import { WorkItemKind } from '../../../core/models/work-items';
import { WorkItemRefComponent } from '../../../shared/components/work-item-ref/work-item-ref.component';
import { RecentWorkItemsService } from '../../../core/services/recent-work-items.service';
import { ProjectPermissionsRefreshService } from '../../../core/services/project-permissions-refresh.service';
import { VisiblePageRefreshService } from '../../../core/services/visible-page-refresh.service';
import { BackButtonComponent } from '../../../shared/components/back-button/back-button.component';
import { HistoryTabComponent } from '../history/history-tab/history-tab.component';
import { ProjectAttachmentsTabComponent } from '../attachments/project-attachments-tab/project-attachments-tab.component';
import { AttachmentTreeExpansionService } from '../attachments/attachment-tree-expansion.service';
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
import { NavigationHistoryService } from '../../../core/services/navigation-history.service';
import { RealtimeService } from '../../../core/services/realtime.service';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';

type ProjectTab = 'details' | 'stakeholders' | 'groups' | 'attachments' | 'history';

@Component({
  selector: 'app-project-details',
  imports: [
    LoadingStateComponent,
    WorkItemRefComponent,
    AppDatePipe,
    ButtonModule,
    ConfirmDialogModule,
    HasProjectAccessDirective,
    HasRoleDirective,
    BackButtonComponent,
    HistoryTabComponent,
    ProjectAttachmentsTabComponent,
    EntityTabsComponent,
    ProjectStatusBadgeComponent,
    GroupsTabComponent,
    StakeholdersTabComponent,
    PersonNamePipe,
    RelativeTimePipe,
    TranslocoDirective,
  ],
  providers: [ConfirmationService, WorkGroupExpansionStateService, AttachmentTreeExpansionService],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailsComponent implements OnDestroy {
  protected readonly kinds = WorkItemKind;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigationHistory = inject(NavigationHistoryService);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly workGroupExpansionState = inject(WorkGroupExpansionStateService);
  private readonly projectPermissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly visiblePageRefresh = inject(VisiblePageRefreshService);
  private readonly realtime = inject(RealtimeService);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private breadcrumbPath = '';

  private readonly recent = inject(RecentWorkItemsService);
  readonly project = this.store.selectSignal(WorkProjectsStoreSelectors.getItem);
  readonly loading = this.store.selectSignal(WorkProjectsStoreSelectors.isLoading);
  readonly isSaving = this.store.selectSignal(WorkProjectsStoreSelectors.isSubmitted);
  readonly projectPermissions = signal<string[]>([]);
  readonly Permissions = Permissions;
  readonly ProjectPermissions = ProjectPermissions;
  readonly Roles = Roles;
  readonly activeTab = signal<ProjectTab>('details');
  // Plan only for people who can see it
  readonly tabs = computed<EntityTab<ProjectTab>[]>(() => {
    currentLanguage();
    return [
      { id: 'details', label: this.transloco.translate('common.details'), icon: 'pi-align-left' },
      { id: 'stakeholders', label: this.transloco.translate('participants.title'), icon: 'pi-users' },
      ...(this.projectPermissions().includes(ProjectPermissions.Project.View)
        ? ([{ id: 'groups', label: this.transloco.translate('plan.tab'), icon: 'pi-list-check' }] as EntityTab<ProjectTab>[])
        : []),
      {
        id: 'attachments',
        label: this.transloco.translate('common.attachments'),
        icon: 'pi-paperclip',
      },
      { id: 'history', label: this.transloco.translate('common.history'), icon: 'pi-history' },
    ];
  });
  readonly focusedMilestoneId = signal<string | null>(null);
  readonly id = this.route.snapshot.paramMap.get('projectId') ?? '';

  constructor() {
    void this.realtime.joinProject(this.id).catch(() => undefined);
    this.breadcrumbPath = `/projects/${this.id}`;
    // placeholder so the breadcrumb doesnt grow a segment after load
    this.breadcrumbOverride.set(this.breadcrumbPath, 'workItem.kind.project');
    effect(() => {
      const project = this.project();
      if (project)
        this.breadcrumbOverride.set(this.breadcrumbPath, `#${project.code} ${project.title}`);
    });
    // once per opening, reloads after edit are not "opened again"
    this.recent.track(WorkItemKind.Project, this.id);
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.activeTab.set(parseProjectTab(params.get('tab')));
      const groupId = params.get('groupId');
      this.focusedMilestoneId.set(params.get('milestoneId'));
      if (groupId) this.workGroupExpansionState.set(this.id, new Set([groupId]));
    });
    // loaded on open, after a long absence and after own changes, not tied to permissions
    this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id }));
    this.visiblePageRefresh
      .onReturn(`project:${this.id}`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id })));

    this.projectPermissionsRefresh
      .watch(this.id)
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
        },
        error: (error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            (error.status === 403 || error.status === 404)
          ) {
            void this.router.navigate(['/errors/403']);
          }
        },
      });
    this.actions$
      .pipe(
        ofType(
          WorkProjectsStoreActions.updateProjectSuccess,
          WorkProjectsStoreActions.addProjectParticipantSuccess,
          WorkProjectsStoreActions.inviteProjectParticipantSuccess,
          WorkProjectsStoreActions.cancelProjectInvitationSuccess,
          WorkProjectsStoreActions.cancelProjectInvitationFailure,
          WorkProjectsStoreActions.updateProjectParticipantSuccess,
          WorkProjectsStoreActions.deleteProjectParticipantSuccess,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.store.dispatch(WorkProjectsStoreActions.loadProject({ id: this.id })));
    this.actions$
      .pipe(ofType(WorkProjectsStoreActions.deleteProjectSuccess), takeUntilDestroyed())
      .subscribe(() => this.toList(true));
  }

  ngOnDestroy(): void {
    void this.realtime.leaveProject(this.id).catch(() => undefined);
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
    if (!this.navigationHistory.back()) this.toList();
  }

  // after a delete it replaces the gone page so Back doesnt return to it
  private toList(replaceHistory = false): void {
    void this.router.navigateByUrl('/projects', { state: { replaceHistory } });
  }

  edit(): void {
    void this.router.navigate(['/projects', this.id, 'edit'], {
      state: { cancelUrl: this.router.url },
    });
  }

  confirmDelete(): void {
    const project = this.project();
    if (!project) return;
    this.confirmation.confirm({
      header: this.transloco.translate('projects.deleteTitle'),
      message: this.transloco.translate('projects.deleteMessage', { title: project.title }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.transloco.translate('common.delete'),
      rejectLabel: this.transloco.translate('common.cancel'),
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
