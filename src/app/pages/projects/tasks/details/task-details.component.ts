import { workItemProgressBadge } from '../../../../core/utils/work-item-progress.utils';
import { HttpErrorResponse } from '@angular/common/http';
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
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import {
  ConfirmDialogComponent,
  confirmTone,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { ProjectPermissions } from '../../../../core/enums/project-permissions.enum';
import { BreadcrumbItem } from '../../../../core/models/breadcrumb-item.model';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkProjectModel } from '../../../../core/models/work-projects/work-project.model';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { ProjectAccessService } from '../../../../core/services/project-access.service';
import { ProjectPermissionsRefreshService } from '../../../../core/services/project-permissions-refresh.service';
import { SnackBarService } from '../../../../core/services/snack-bar.service';
import { WorkProjectsService } from '../../../../core/services/work-projects.service';
import { WorkTasksService } from '../../../../core/services/work-tasks.service';
import { BackButtonComponent } from '../../../../shared/components/back-button/back-button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import {
  EntityTab,
  EntityTabsComponent,
} from '../../../../shared/components/entity-tabs/entity-tabs.component';
import { PersonNamePipe } from '../../../../shared/pipes/person-name.pipe';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { TaskStatusBadgeComponent } from '../components/task-status-badge/task-status-badge.component';
import { TaskDetailsTabComponent } from '../components/task-details-tab/task-details-tab.component';
import { WorkTaskListComponent } from '../components/work-task-list/work-task-list.component';

type TaskTab = 'details' | 'subtasks' | 'attachments' | 'history';

interface TaskPageData {
  task: WorkTaskModel;
  project: WorkProjectModel;
  permissions: string[];
}

@Component({
  selector: 'app-task-details',
  imports: [
    ButtonModule,
    ConfirmDialogComponent,
    BackButtonComponent,
    EmptyStateComponent,
    EntityTabsComponent,
    PersonNamePipe,
    RelativeTimePipe,
    TaskStatusBadgeComponent,
    TaskDetailsTabComponent,
    WorkTaskListComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './task-details.component.html',
  styleUrl: './task-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasks = inject(WorkTasksService);
  private readonly projects = inject(WorkProjectsService);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly permissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breadcrumbs = inject(BreadcrumbOverrideService);

  // Moving between a task and its subtasks stays on this route, so Angular reuses the component.
  // The ids therefore follow paramMap and must not be read once from the snapshot.
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
  readonly activeTab = signal<TaskTab>(parseTaskTab(this.route.snapshot.queryParamMap.get('tab')));
  readonly tabs = computed<readonly EntityTab<TaskTab>[]>(() => {
    const task = this.task();
    // A subtask has no subtasks of its own, so the tab is not shown at all — an empty tab that
    // exists only to say it can never hold anything is worse than no tab.
    const subtasks: EntityTab<TaskTab>[] = task?.isSubtask
      ? []
      : [
          {
            id: 'subtasks',
            label: 'Subtasks',
            // Not the same icon as the ticket's Tasks tab: the two tabs sit one click apart and
            // have to be told apart at a glance.
            icon: 'pi-sitemap',
            badge: workItemProgressBadge(task?.doneSubtaskCount, task?.subtaskCount),
          },
        ];

    return [
      { id: 'details', label: 'Details', icon: 'pi-align-left' },
      ...subtasks,
      { id: 'attachments', label: 'Attachments', icon: 'pi-paperclip' },
      { id: 'history', label: 'History', icon: 'pi-history' },
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

  back(): void {
    const task = this.task();
    if (!task || !this.projectId) {
      void this.router.navigate(['/projects']);
      return;
    }
    if (task.parentWorkTaskId) {
      void this.router.navigate(
        ['/projects', this.projectId, 'tickets', task.workTicketId, 'tasks', task.parentWorkTaskId],
        { queryParams: { tab: 'subtasks' } },
      );
    } else {
      void this.router.navigate(['/projects', this.projectId, 'tickets', task.workTicketId], {
        queryParams: { tab: 'tasks' },
      });
    }
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
    if (task.subtaskCount > 0) {
      this.confirmation.confirm({
        key: 'taskDelete',
        header: "This task can't be deleted yet",
        message: `#${task.code} ${task.title}
It still has ${task.subtaskCount} ${task.subtaskCount === 1 ? 'subtask' : 'subtasks'}. Delete them first, then delete the task.`,
        acceptLabel: 'Got it',
        rejectVisible: false,
        acceptButtonProps: confirmTone('warning'),
      });
      return;
    }
    this.confirmation.confirm({
      key: 'taskDelete',
      header: `Delete ${task.isSubtask ? 'subtask' : 'task'}?`,
      message: `#${task.code} ${task.title}
This ${task.isSubtask ? 'subtask' : 'task'} will be deleted. This action cannot be undone.`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: confirmTone('danger'),
      accept: () => this.delete(task),
    });
  }

  /**
   * The whole trail is set at once instead of renaming route segments: a subtask has no segment
   * of its own for the parent task, and without this crumb the trail jumps straight from the
   * ticket to the subtask.
   */
  private showBreadcrumbs(result: TaskPageData): void {
    const task = result.task;
    const ticketPath = `/projects/${this.projectId}/tickets/${this.ticketId}`;
    const items: BreadcrumbItem[] = [
      { title: 'Projects', path: '/projects', icon: 'pi-briefcase' },
      {
        title: `#${result.project.code} ${result.project.title}`,
        path: `/projects/${this.projectId}`,
      },
      {
        title: `#${task.workTicketCode} ${task.workTicketTitle}`,
        path: ticketPath,
        icon: 'pi-ticket',
      },
    ];

    if (task.parentWorkTaskId) {
      items.push({
        title: `#${task.parentWorkTaskCode} ${task.parentWorkTaskTitle}`,
        path: `${ticketPath}/tasks/${task.parentWorkTaskId}`,
        icon: 'pi-check-square',
      });
    }

    items.push({
      title: `#${task.code} ${task.title}`,
      path: `${ticketPath}/tasks/${task.id}`,
      icon: task.isSubtask ? 'pi-sitemap' : 'pi-check-square',
    });

    this.breadcrumbs.setTrail(`${ticketPath}/tasks/${task.id}`, items);
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

    // A task reached through a stale ticket id still resolves; send the user to its real ticket.
    if (result.task.workTicketId !== this.ticketId) {
      void this.router.navigate(
        ['/projects', this.projectId, 'tickets', result.task.workTicketId, 'tasks', result.task.id],
        { queryParamsHandling: 'preserve', replaceUrl: true },
      );
      return;
    }

    this.task.set(result.task);
    // ?tab=subtasks can arrive from a bookmark or from the parent's tab state, and a subtask has
    // no such tab — fall back to Details instead of rendering an empty body.
    if (result.task.isSubtask && this.activeTab() === 'subtasks') this.selectTab('details');
    this.applyPermissions(result.permissions);
    this.showBreadcrumbs(result);
  }

  private applyPermissions(permissions: string[]): void {
    this.canCreate.set(permissions.includes(ProjectPermissions.Task.Create));
    this.canEdit.set(permissions.includes(ProjectPermissions.Task.Edit));
    this.canDelete.set(permissions.includes(ProjectPermissions.Task.Delete));
  }

  /** A 403 means the cached permissions are already wrong; re-read them so the page stops
   *  offering an action the server refuses. */
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
          this.snackBar.success(`${task.isSubtask ? 'Subtask' : 'Task'} deleted.`);
          this.back();
        },
        error: (error: HttpErrorResponse) => {
          this.snackBar.error(taskDeleteErrorMessage(error));
          this.refreshPermissionsAfterForbidden(error);
        },
      });
  }
}

export function parseTaskTab(value: string | null): TaskTab {
  return value === 'subtasks' || value === 'attachments' || value === 'history' ? value : 'details';
}

export function taskTabQueryParam(tab: TaskTab): string | null {
  return tab === 'details' ? null : tab;
}

function taskDeleteErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 400) {
    const errors = error.error?.errors as { error?: string }[] | undefined;
    const message = errors?.find((item) => item.error)?.error;
    if (message) return message;
  }
  return 'We could not delete this item. Please try again.';
}
