import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Observable, catchError, finalize, of } from 'rxjs';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { BreadcrumbOverrideService } from '../../../../../core/services/breadcrumb-override.service';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { projectNavigationUrl } from '../../../../../core/utils/project-navigation.utils';
import { BackButtonComponent } from '../../../../../shared/components/back-button/back-button.component';
import { eligibleTaskAssignees } from './task-assignee-options';
import { TaskFormContextService } from './task-form-context.service';
import { TaskFormFieldsComponent } from '../task-form-fields/task-form-fields.component';

interface TaskFormNavigationState {
  returnUrl?: unknown;
}

@Component({
  selector: 'app-task-form-page',
  imports: [ButtonModule, ConfirmDialogModule, BackButtonComponent, TaskFormFieldsComponent],
  providers: [ConfirmationService, TaskFormContextService],
  templateUrl: './task-form-page.component.html',
  styleUrls: [
    '../../../components/form-page/form-page.component.scss',
    './task-form-page.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormPageComponent implements OnDestroy {
  readonly mode = input.required<'create' | 'edit'>();

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tasks = inject(WorkTasksService);
  private readonly formContext = inject(TaskFormContextService);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly breadcrumbOverride = inject(BreadcrumbOverrideService);
  private readonly navigationState = history.state as TaskFormNavigationState;
  private navigationComplete = false;

  readonly projectId = this.route.snapshot.paramMap.get('projectId');
  readonly ticketId = this.route.snapshot.paramMap.get('ticketId');
  readonly taskId = this.route.snapshot.paramMap.get('taskId');
  readonly parentTaskId = this.route.snapshot.queryParamMap.get('parentTaskId');
  readonly isEdit = computed(() => this.mode() === 'edit');
  readonly isSubtask = signal(Boolean(this.parentTaskId));
  readonly pageTitle = computed(() =>
    this.isEdit()
      ? `Edit ${this.isSubtask() ? 'subtask' : 'task'}`
      : `Create ${this.isSubtask() ? 'subtask' : 'task'}`,
  );
  readonly submitLabel = computed(() => (this.isEdit() ? 'Save' : 'Create'));
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly submitted = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly project = signal<WorkProjectModel | null>(null);
  readonly contextTask = signal<WorkTaskModel | null>(null);
  readonly priorities = signal<DictionaryModel[]>([]);
  readonly statuses = signal<DictionaryModel[]>([]);
  readonly assignees = computed(() => eligibleTaskAssignees(this.project()?.participants ?? []));

  readonly returnUrl =
    projectNavigationUrl(this.navigationState.returnUrl) ?? this.directReturnUrl();

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(2000)],
    priorityId: [null as number | null, Validators.required],
    statusId: [null as number | null],
    deadline: [null as Date | null],
    assigneeId: [null as string | null],
  });

  constructor() {
    const editing = Boolean(this.taskId);
    if (!this.projectId || !this.ticketId) {
      this.loading.set(false);
      this.loadError.set('The task route is invalid. Return to the ticket and try again.');
      return;
    }

    this.formContext
      .load(this.projectId, this.ticketId, this.taskId, this.parentTaskId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loadError.set("We couldn't load the task form. Return to the ticket and try again.");
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;
        if (result.task && result.task.workTicketId !== this.ticketId) {
          this.loadError.set('The selected task does not belong to this ticket.');
          return;
        }
        this.project.set(result.project);
        this.priorities.set(result.priorities);
        this.statuses.set(result.statuses);
        this.contextTask.set(result.task);
        this.isSubtask.set(Boolean(this.parentTaskId || result.task?.isSubtask));
        this.breadcrumbOverride.set(
          `/projects/${this.projectId}`,
          `#${result.project.code} ${result.project.title}`,
        );
        const ticketCode = result.task?.workTicketCode ?? result.ticket?.code;
        const ticketTitle = result.task?.workTicketTitle ?? result.ticket?.title;
        if (ticketCode && ticketTitle) {
          this.breadcrumbOverride.set(
            `/projects/${this.projectId}/tickets/${this.ticketId}`,
            `#${ticketCode} ${ticketTitle}`,
          );
        }
        if (editing && result.task && this.taskId) {
          this.breadcrumbOverride.set(
            `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.taskId}`,
            `#${result.task.code} ${result.task.title}`,
          );
        }
        if (editing && result.task) this.patchForm(result.task);
      });
  }

  ngOnDestroy(): void {
    if (!this.projectId) return;
    this.breadcrumbOverride.clear(`/projects/${this.projectId}`);
    if (!this.ticketId) return;
    this.breadcrumbOverride.clear(`/projects/${this.projectId}/tickets/${this.ticketId}`);
    if (this.taskId) {
      this.breadcrumbOverride.clear(
        `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.taskId}`,
      );
    }
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || !this.projectId) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.priorityId === null) return;
    this.saving.set(true);

    const common = {
      title: (value.title ?? '').trim(),
      description: (value.description ?? '').trim() || null,
      priorityId: value.priorityId,
      deadline: value.deadline?.toISOString() ?? null,
      assigneeId: value.assigneeId,
    };
    const request: Observable<string | void> =
      this.isEdit() && this.taskId && value.statusId !== null
        ? this.tasks.updateWorkTask(this.projectId, this.taskId, {
            ...common,
            statusId: value.statusId,
          })
        : this.tasks.createWorkTask(this.projectId, {
            ...common,
            workTicketId: this.contextTask()?.workTicketId ?? this.ticketId ?? '',
            parentWorkTaskId: this.parentTaskId,
          });

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (createdId) => {
          this.navigationComplete = true;
          this.snackBar.success(
            `${this.isSubtask() ? 'Subtask' : 'Task'} ${this.isEdit() ? 'updated' : 'created'} successfully.`,
          );
          if (!this.isEdit() && typeof createdId === 'string' && !this.navigationState.returnUrl) {
            void this.router.navigate([
              '/projects',
              this.projectId,
              'tickets',
              this.ticketId,
              'tasks',
              createdId,
            ]);
            return;
          }
          void this.router.navigateByUrl(this.returnUrl);
        },
        error: (error: HttpErrorResponse) => this.snackBar.error(taskErrorMessage(error)),
      });
  }

  cancel(): void {
    if (!this.hasUnsavedChanges()) {
      void this.router.navigateByUrl(this.returnUrl);
      return;
    }
    void this.confirmUnsavedChanges().then((confirmed) => {
      if (confirmed) void this.router.navigateByUrl(this.returnUrl);
    });
  }

  hasUnsavedChanges(): boolean {
    return !this.navigationComplete && this.form.dirty;
  }

  confirmUnsavedChanges(): Promise<boolean> {
    return new Promise((resolve) =>
      this.confirmation.confirm({
        header: 'Discard changes',
        message: 'You have unsaved task changes. Leave this page without saving?',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Leave',
        rejectLabel: 'Stay',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.navigationComplete = true;
          resolve(true);
        },
        reject: () => resolve(false),
      }),
    );
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  private patchForm(task: WorkTaskModel): void {
    this.form.patchValue({
      title: task.title,
      description: task.description ?? '',
      priorityId: task.priority.id,
      statusId: task.status.id,
      deadline: task.deadline ? new Date(task.deadline) : null,
      assigneeId: task.assignee?.id ?? null,
    });
    this.form.controls.statusId.addValidators(Validators.required);
    this.form.markAsPristine();
  }

  private directReturnUrl(): string {
    if (!this.projectId) return '/projects';
    if (!this.ticketId) return `/projects/${this.projectId}`;
    if (this.taskId)
      return `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.taskId}`;
    if (this.parentTaskId)
      return `/projects/${this.projectId}/tickets/${this.ticketId}/tasks/${this.parentTaskId}?tab=subtasks`;
    return `/projects/${this.projectId}/tickets/${this.ticketId}?tab=tasks`;
  }
}

function taskErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 400) {
    const errors = error.error?.errors as { error?: string }[] | undefined;
    const message = errors?.find((item) => item.error)?.error;
    if (message) return message;
  }
  if (error.status === 403) return 'You no longer have permission to manage tasks in this project.';
  if (error.status === 404) return 'The task, parent task or ticket is no longer available.';
  return "We couldn't save the task. Please try again.";
}
