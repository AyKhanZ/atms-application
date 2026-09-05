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
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import { ProjectPermissions } from '../../../../core/enums/project-permissions.enum';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkProjectModel } from '../../../../core/models/work-projects/work-project.model';
import { BreadcrumbOverrideService } from '../../../../core/services/breadcrumb-override.service';
import { ProjectAccessService } from '../../../../core/services/project-access.service';
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
    ConfirmDialogModule,
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
    return [
      { id: 'details', label: 'Details', icon: 'pi-align-left' },
      {
        id: 'subtasks',
        label: 'Subtasks',
        icon: 'pi-list-check',
        badge: `${task?.doneSubtaskCount ?? 0}/${task?.subtaskCount ?? 0}`,
      },
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
        message: `“#${task.code} ${task.title}” still has ${task.subtaskCount} ${task.subtaskCount === 1 ? 'subtask' : 'subtasks'}. Delete them first, then delete the task.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Got it',
        rejectVisible: false,
      });
      return;
    }
    this.confirmation.confirm({
      key: 'taskDelete',
      header: `Delete ${task.isSubtask ? 'subtask' : 'task'}?`,
      message: `“#${task.code} ${task.title}” will be deleted. This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => this.delete(task),
    });
  }

  private clearBreadcrumbs(): void {
    if (!this.projectId) return;
    this.breadcrumbs.clear(`/projects/${this.projectId}`);
    if (!this.ticketId) return;
    this.breadcrumbs.clear(`/projects/${this.projectId}/tickets/${this.ticketId}`);
    if (this.taskId) {
      this.breadcrumbs.clear(
        `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.taskId}`,
      );
    }
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
    this.canCreate.set(result.permissions.includes(ProjectPermissions.Task.Create));
    this.canEdit.set(result.permissions.includes(ProjectPermissions.Task.Edit));
    this.canDelete.set(result.permissions.includes(ProjectPermissions.Task.Delete));
    this.breadcrumbs.set(
      `/projects/${this.projectId}`,
      `#${result.project.code} ${result.project.title}`,
    );
    this.breadcrumbs.set(
      `/projects/${this.projectId}/tickets/${this.ticketId}`,
      `#${result.task.workTicketCode} ${result.task.workTicketTitle}`,
    );
    this.breadcrumbs.set(
      `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.taskId}`,
      `#${result.task.code} ${result.task.title}`,
    );
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
        error: (error: HttpErrorResponse) => this.snackBar.error(taskDeleteErrorMessage(error)),
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
