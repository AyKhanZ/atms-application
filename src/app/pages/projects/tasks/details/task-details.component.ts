import { workItemProgressBadge } from '../../../../core/utils/work-item-progress.utils';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ButtonModule } from 'primeng/button';
import { currentLanguage } from '../../../../core/i18n/active-language';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { ProjectPermissions } from '../../../../core/enums/project-permissions.enum';
import { WorkItemKind } from '../../../../core/models/work-items';
import { workTaskKind } from '../../../../core/utils/work-task.utils';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkProjectModel } from '../../../../core/models/work-projects/work-project.model';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { FoldedSectionsService } from '../../../../core/services/folded-sections.service';
import { RecentWorkItemsService } from '../../../../core/services/recent-work-items.service';
import { ProjectAccessService } from '../../../../core/services/project-access.service';
import { ProjectPermissionsRefreshService } from '../../../../core/services/project-permissions-refresh.service';
import { SnackBarService } from '../../../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../../../core/services/work-projects.service';
import { WorkTasksService } from '../../../../core/services/work-tasks.service';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { HistoryTabComponent } from '../../history/history-tab/history-tab.component';
import { WorkProjectParticipantModel } from '../../../../core/models/work-projects';
import { TaskCommentsService } from '../../comments/task-comments.service';
import { TaskAttachmentsTabComponent } from '../../attachments/task-attachments-tab/task-attachments-tab.component';
import { AttachmentTreeExpansionService } from '../../attachments/attachment-tree-expansion.service';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../../../shared/components/entity-tabs/entity-tabs.component';
import { PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { TaskStatusBadgeComponent } from '../components/task-status-badge/task-status-badge.component';
import { TaskDetailsTabComponent } from '../components/task-details-tab/task-details-tab.component';
import { WorkTaskListComponent } from '../components/work-task-list/work-task-list.component';
import { NavigationHistoryService } from '../../../../core/services/navigation-history.service';
import { validationMessage } from '../../../../core/utils/http-error.utils';
import {
  TaskTab,
  parseTaskTab,
  taskDeleteConfirmation,
  taskBreadcrumbTrail,
  taskParentRoute,
  taskTabQueryParam,
} from './task-details.utils';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';

interface TaskPageData {
  task: WorkTaskModel;
  project: WorkProjectModel;
  permissions: string[];
}

@Component({
  selector: 'app-task-details',
  imports: [
    LoadingStateComponent,
    WorkItemRefComponent,
    ButtonModule,
    ConfirmDialogComponent,
    BackButtonComponent,
    HistoryTabComponent,
    TaskAttachmentsTabComponent,
    EntityTabsComponent,
    PersonNamePipe,
    RelativeTimePipe,
    TaskStatusBadgeComponent,
    TaskDetailsTabComponent,
    WorkTaskListComponent,
    TranslocoDirective,
  ],
  providers: [ConfirmationService, AttachmentTreeExpansionService, TaskCommentsService],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsComponent implements OnDestroy {
  protected readonly kinds = WorkItemKind;
  private readonly route = inject(ActivatedRoute);
  private readonly recent = inject(RecentWorkItemsService);
  private readonly router = inject(Router);
  private readonly navigationHistory = inject(NavigationHistoryService);
  private readonly tasks = inject(WorkTasksService);
  private readonly projects = inject(WorkProjectsService);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly permissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breadcrumbs = inject(BreadcrumbOverrideService);
  protected readonly comments = inject(TaskCommentsService);
  private readonly injector = inject(Injector);
  private readonly sections = inject(FoldedSectionsService);

  // task <-> subtask stays on this route and angular reuses the component, so ids follow paramMap
  private projectId: string | null = null;
  private ticketId: string | null = null;
  private taskId: string | null = null;

  readonly task = signal<WorkTaskModel | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly deleting = signal(false);
  readonly canCreate = signal(false);
  readonly canEdit = signal(false);
  readonly canDelete = signal(false);
  readonly canComment = signal(false);
  readonly participants = signal<readonly WorkProjectParticipantModel[]>([]);
  readonly activeTab = signal<TaskTab>(parseTaskTab(this.route.snapshot.queryParamMap.get('tab')));
  readonly tabs = computed<readonly EntityTab<TaskTab>[]>(() => {
    currentLanguage();
    const task = this.task();
    // subtasks cant have subtasks, so no tab at all
    const subtasks: EntityTab<TaskTab>[] = task?.isSubtask
      ? []
      : [
          {
            id: 'subtasks',
            label: this.transloco.translate('workItem.kind.subtasks'),
            // different icon from the tickets Tasks tab, they are one click apart
            icon: 'pi-sitemap',
            badge: workItemProgressBadge(task?.doneSubtaskCount, task?.subtaskCount),
          },
        ];

    return [
      { id: 'details', label: this.transloco.translate('common.details'), icon: 'pi-align-left' },
      ...subtasks,
      { id: 'attachments', label: this.transloco.translate('common.attachments'), icon: 'pi-paperclip' },
      { id: 'history', label: this.transloco.translate('common.history'), icon: 'pi-history' },
    ];
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.activeTab.set(parseTaskTab(params.get('tab')));
    });

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.clearBreadcrumbs();
          this.projectId = params.get('projectId');
          this.ticketId = params.get('ticketId');
          this.taskId = params.get('taskId');
          this.task.set(null);
          this.comments.watch(null);
          this.loadError.set(false);
          this.loading.set(true);

          return this.load();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.apply(result));
  }

  ngOnDestroy(): void {
    this.clearBreadcrumbs();
  }

  selectTab(tab: TaskTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: taskTabQueryParam(tab) },
      queryParamsHandling: 'merge',
    });
  }

  openDiscussion(): void {
    this.selectTab('details');
    this.sections.open('task.discussion').set(true);
    afterNextRender(
      () =>
        document
          .getElementById('discussion')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      { injector: this.injector },
    );
  }

  // parent when unknown, e.g. after a shared link
  back(): void {
    if (!this.navigationHistory.back()) this.up();
  }

  // after a delete it replaces the gone page so Back doesnt lead to it
  private up(replaceHistory = false): void {
    const task = this.task();
    const state = { replaceHistory };
    if (!task) {
      void this.router.navigate(['/projects'], { state });
      return;
    }
    const parent = taskParentRoute(task);
    void this.router.navigate(parent.commands, { queryParams: parent.queryParams, state });
  }

  edit(): void {
    if (!this.projectId || !this.ticketId || !this.taskId || !this.canEdit()) return;
    void this.router.navigate(
      ['/projects', this.projectId, 'tickets', this.ticketId, 'tasks', this.taskId, 'edit'],
      { state: { returnUrl: this.router.url } },
    );
  }

  confirmDelete(): void {
    const task = this.task();
    if (!task || !this.canDelete() || this.deleting()) return;
    this.confirmation.confirm(taskDeleteConfirmation(task, this.transloco, () => this.delete(task)));
  }

  private clearBreadcrumbs(): void {
    if (!this.projectId || !this.ticketId || !this.taskId) return;
    this.breadcrumbs.clearTrail(
      `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.taskId}`,
    );
  }

  private load() {
    if (!this.projectId || !this.ticketId || !this.taskId) {
      this.loading.set(false);
      this.loadError.set(true);
      return of(null);
    }

    return forkJoin({
      task: this.tasks.getWorkTask(this.projectId, this.taskId),
      project: this.projects.getProject(this.projectId),
      permissions: this.projectAccess.getPermissions(this.projectId),
    }).pipe(
      catchError(() => {
        this.loadError.set(true);
        return of(null);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  private apply(result: TaskPageData | null): void {
    if (!result) return;

    // stale ticket id: send to the real ticket
    if (result.task.workTicket.id !== this.ticketId) {
      void this.router.navigate(
        [
          '/projects',
          this.projectId,
          'tickets',
          result.task.workTicket.id,
          'tasks',
          result.task.id,
        ],
        { queryParamsHandling: 'preserve', replaceUrl: true },
      );
      return;
    }

    this.task.set(result.task);
    this.participants.set(result.project.participants);
    this.comments.watch(result.task);
    // ?tab=subtasks can come from a bookmark, a subtask has no such tab
    if (result.task.isSubtask && this.activeTab() === 'subtasks') this.selectTab('details');
    this.applyPermissions(result.permissions);
    this.breadcrumbs.setTrail(
      `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${result.task.id}`,
      taskBreadcrumbTrail(result.project, result.task),
    );
    this.recent.track(workTaskKind(result.task), result.task.id);
  }

  private applyPermissions(permissions: string[]): void {
    this.canCreate.set(permissions.includes(ProjectPermissions.Task.Create));
    this.canEdit.set(permissions.includes(ProjectPermissions.Task.Edit));
    this.canDelete.set(permissions.includes(ProjectPermissions.Task.Delete));
    this.canComment.set(permissions.includes(ProjectPermissions.Comment.Edit));
  }

  // 403 = cached permissions are wrong, re-read them
  private refreshPermissionsAfterForbidden(error: HttpErrorResponse): void {
    if (error.status !== 403 || !this.projectId) return;
    this.permissionsRefresh
      .refreshAfterForbidden(this.projectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (permissions) => this.applyPermissions(permissions),
        error: () => undefined,
      });
  }

  private delete(task: WorkTaskModel): void {
    if (!this.projectId) return;
    this.deleting.set(true);
    this.tasks
      .deleteWorkTask(this.projectId, task.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deleting.set(false)),
      )
      .subscribe({
        next: () => {
          this.snackBar.success(
            this.transloco.translate(task.isSubtask ? 'tasks.subtaskDeleted' : 'tasks.taskDeleted'),
          );
          this.up(true);
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.error(
            validationMessage(error) ?? this.transloco.translate('tasks.deleteFailed'),
          );
          this.refreshPermissionsAfterForbidden(error);
        },
      });
  }
}
