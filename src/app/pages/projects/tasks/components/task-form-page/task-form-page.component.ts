import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
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
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { askToCloseOpenWork } from '../../../../../shared/components/confirm-dialog/close-open-work';
import { WorkTaskStatus } from '../../../../../core/enums/work-task-status.enum';
import { catchError, finalize, of, take } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { WorkTasksStoreActions, WorkTasksStoreSelectors } from '../../../../../store/work-tasks';
import { WorkItemMutationError } from '../../../../../core/models/work-items';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { TaskFormBreadcrumbsService } from './task-form-breadcrumbs.service';
import { TaskParentSelectComponent } from '../task-parent-select/task-parent-select.component';
import {
  TaskParentOption,
  editedTaskParentOption,
  taskParentOption,
  ticketParentOption,
} from '../task-parent-select/task-parent-option';
import { ProjectPermissionsRefreshService } from '../../../../../core/services/project-permissions-refresh.service';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
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
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    ConfirmDialogComponent,
    BackButtonComponent,
    TaskFormFieldsComponent,
    TaskParentSelectComponent,
  ],
  providers: [ConfirmationService, TaskFormContextService, TaskFormBreadcrumbsService],
  templateUrl: './task-form-page.component.html',
  styleUrls: [
    '../../../components/form-page/form-page.component.scss',
    './task-form-page.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormPageComponent {
  readonly mode = input.required<'create' | 'edit'>();

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly actions$ = inject(Actions);
  private readonly formContext = inject(TaskFormContextService);
  private readonly snackBar = inject(SnackBarService);
  private readonly permissionsRefresh = inject(ProjectPermissionsRefreshService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBreadcrumbs = inject(TaskFormBreadcrumbsService);
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
  readonly saving = this.store.selectSignal(WorkTasksStoreSelectors.isSaving);
  readonly submitted = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly project = signal<WorkProjectModel | null>(null);
  readonly contextTask = signal<WorkTaskModel | null>(null);
  readonly selectedParent = signal<TaskParentOption | null>(null);
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
    workTicketId: [this.ticketId, Validators.required],
    parentWorkTaskId: [this.parentTaskId],
  });

  constructor() {
    const editing = Boolean(this.taskId);
    if (!editing) this.formBreadcrumbs.placeholder(Boolean(this.parentTaskId));
    if (!editing && this.parentTaskId)
      this.form.controls.parentWorkTaskId.addValidators(Validators.required);
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
        // task can move to another ticket, an old link points to the wrong one -> go to the real ticket
        if (result.task && result.task.workTicket.id !== this.ticketId) {
          this.redirectToOwningTicket(result.task.workTicket.id);
          return;
        }
        if (!editing && this.parentTaskId && result.task?.isSubtask) {
          this.loadError.set('A subtask cannot be used as a parent. Choose a top-level task.');
          return;
        }
        this.project.set(result.project);
        this.priorities.set(result.priorities);
        this.statuses.set(result.statuses);
        this.contextTask.set(result.task);
        this.isSubtask.set(Boolean(this.parentTaskId || result.task?.isSubtask));
        // create: loaded task is the parent; edit: its the item, parent is the task above or its ticket
        const parent = editing
          ? editedTaskParentOption(result.task, result.ticket)
          : result.task
            ? taskParentOption(result.task)
            : result.ticket
              ? ticketParentOption(result.ticket)
              : null;
        this.selectedParent.set(parent);
        // edit route has no parentTaskId, without this a subtask saved untouched became a task (parentWorkTaskId: null)
        this.form.patchValue({
          workTicketId: parent?.ticketId ?? this.ticketId,
          parentWorkTaskId: parent?.kind === 'task' ? parent.id : null,
        });
        this.formBreadcrumbs.show(result.project, parent, editing ? result.task : null);
        if (editing && result.task) this.patchForm(result.task);
      });
  }

  // replaces history so Back doesnt go to the stale link again
  private redirectToOwningTicket(ticketId: string): void {
    const path = ['/projects', this.projectId, 'tickets', ticketId, 'tasks'];
    void this.router.navigate(this.taskId ? [...path, this.taskId, 'edit'] : [...path, 'create'], {
      queryParamsHandling: 'preserve',
      replaceUrl: true,
      state: { returnUrl: this.returnUrl },
    });
  }

  selectParent(parent: TaskParentOption): void {
    if (this.saving()) return;
    // task -> ticket, subtask -> task, anything else is a wrong list
    if (this.isSubtask() !== (parent.kind === 'task')) return;
    this.selectedParent.set(parent);
    this.form.patchValue({
      workTicketId: parent.ticketId,
      parentWorkTaskId: parent.kind === 'task' ? parent.id : null,
    });
    this.form.markAsDirty();
    const project = this.project();
    if (project) this.formBreadcrumbs.show(project, parent, null);
  }
  submit(): void {
    if (this.loading() || this.loadError() || this.saving()) return;
    this.submitted.set(true);
    if (this.form.invalid || !this.projectId) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.priorityId === null || !value.workTicketId) return;

    // Done with open subtasks: ask, dont refuse and dont do it silently
    const task = this.contextTask();
    const openSubtasks = task ? task.subtaskCount - task.doneSubtaskCount : 0;
    const closing =
      this.isEdit() &&
      value.statusId === WorkTaskStatus.Done &&
      task?.status.id !== WorkTaskStatus.Done;
    if (task && closing && openSubtasks > 0) {
      void askToCloseOpenWork(this.confirmation, {
        key: 'taskClose',
        itemRef: `TASK #${task.code}`,
        title: task.title,
        openCount: openSubtasks,
        childLabel: 'subtask',
      }).then((choice) => {
        if (choice !== 'cancel') this.save(choice === 'all');
      });
      return;
    }

    this.save(false);
  }

  private save(completeSubtasks: boolean): void {
    const value = this.form.getRawValue();
    if (value.priorityId === null || !value.workTicketId || !this.projectId) return;
    const common = {
      title: (value.title ?? '').trim(),
      description: (value.description ?? '').trim() || null,
      priorityId: value.priorityId,
      deadline: value.deadline?.toISOString() ?? null,
      assigneeId: value.assigneeId,
    };
    // one save at a time, the button is disabled meanwhile
    this.actions$
      .pipe(
        ofType(
          WorkTasksStoreActions.createTaskSuccess,
          WorkTasksStoreActions.updateTaskSuccess,
          WorkTasksStoreActions.createTaskFailure,
          WorkTasksStoreActions.updateTaskFailure,
        ),
        take(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((action) => {
        if ('error' in action) {
          this.snackBar.error(taskErrorMessage(action.error));
          // cached permissions said ok, drop them so the next page is right
          if (action.error.status === 403 && this.projectId) {
            this.permissionsRefresh
              .refreshAfterForbidden(this.projectId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({ error: () => undefined });
          }
          return;
        }
        const createdId = 'id' in action ? action.id : null;
        this.navigationComplete = true;
        // same wording as tickets
        const label = this.isSubtask() ? 'Subtask' : 'Task';
        this.snackBar.success(this.isEdit() ? `${label} changes saved.` : `${label} created.`);
        if (!this.isEdit() && createdId) {
          void this.router.navigate([
            '/projects',
            this.projectId,
            'tickets',
            value.workTicketId,
            'tasks',
            createdId,
          ]);
          return;
        }
        void this.router.navigateByUrl(this.returnUrl);
      });

    this.store.dispatch(
      this.isEdit() && this.taskId && value.statusId !== null
        ? WorkTasksStoreActions.updateTask({
            projectId: this.projectId,
            taskId: this.taskId,
            command: {
              ...common,
              statusId: value.statusId,
              workTicketId: value.workTicketId,
              parentWorkTaskId: value.parentWorkTaskId,
              completeSubtasks,
            },
          })
        : WorkTasksStoreActions.createTask({
            projectId: this.projectId,
            command: {
              ...common,
              workTicketId: value.workTicketId,
              parentWorkTaskId: value.parentWorkTaskId,
            },
          }),
    );
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

function taskErrorMessage(error: WorkItemMutationError): string {
  if (error.message) return error.message;
  if (error.status === 403) return 'You no longer have permission to manage tasks in this project.';
  if (error.status === 404) return 'The task, parent task or ticket is no longer available.';
  return "We couldn't save the task. Please try again.";
}
