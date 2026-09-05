import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Subject, catchError, finalize, merge, of, switchMap, tap } from 'rxjs';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { SnackBarService } from '../../../../../core/services/snack-bar.service';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { TicketPriorityBadgeComponent } from '../../../tickets/components/ticket-priority-badge/ticket-priority-badge.component';
import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-work-task-list',
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    EmptyStateComponent,
    TicketPriorityBadgeComponent,
    TaskStatusBadgeComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './work-task-list.component.html',
  styleUrl: './work-task-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkTaskListComponent {
  readonly projectId = input.required<string>();
  readonly ticketId = input<string | null>(null);
  readonly parentTaskId = input<string | null>(null);
  readonly canCreate = input(false);
  readonly canEdit = input(false);
  readonly canDelete = input(false);

  private readonly tasksService = inject(WorkTasksService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly snackBar = inject(SnackBarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly items = signal<WorkTaskModel[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly loadError = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly hasMore = signal(false);

  /**
   * The list is reused for a ticket's tasks and for a task's subtasks, and both are reached by
   * navigating between items on the same route. Angular reuses the component in that case, so the
   * first page has to follow the inputs rather than a one-off ngOnInit call.
   */
  private readonly queryKey = computed(
    () => `${this.projectId()}|${this.ticketId() ?? ''}|${this.parentTaskId() ?? ''}`,
  );

  private readonly reload = new Subject<void>();

  constructor() {
    merge(toObservable(this.queryKey), this.reload)
      .pipe(
        tap(() => {
          this.items.set([]);
          this.nextCursor.set(null);
          this.hasMore.set(false);
          this.loading.set(true);
          this.loadError.set(false);
        }),
        switchMap(() =>
          this.fetch(null).pipe(
            catchError(() => {
              this.loadError.set(true);
              return of(null);
            }),
            finalize(() => this.loading.set(false)),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((page) => {
        if (!page) return;
        this.items.set(page.items);
        this.nextCursor.set(page.nextCursor);
        this.hasMore.set(page.hasMore);
      });
  }

  confirmDelete(task: WorkTaskModel, event: Event): void {
    event.stopPropagation();
    const kind = task.isSubtask ? 'subtask' : 'task';

    // A blocked delete is explained in a dialog, not a snackbar: the reason has to stay on screen
    // long enough to act on, and this matches how the plan tab refuses to delete a filled group.
    if (task.subtaskCount > 0) {
      this.confirmation.confirm({
        key: 'taskListDelete',
        header: `This ${kind} can't be deleted yet`,
        message: `“#${task.code} ${task.title}” still has ${task.subtaskCount} ${task.subtaskCount === 1 ? 'subtask' : 'subtasks'}. Delete them first, then delete the ${kind}.`,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Got it',
        rejectVisible: false,
      });
      return;
    }

    this.confirmation.confirm({
      key: 'taskListDelete',
      header: `Delete ${kind}?`,
      message: `“#${task.code} ${task.title}” will be deleted. This action cannot be undone.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => this.delete(task),
    });
  }

  create(): void {
    const parentTaskId = this.parentTaskId();
    const ticketId = this.ticketId();
    const projectId = this.projectId();
    if (!ticketId) return;

    void this.router.navigate(['/projects', projectId, 'tickets', ticketId, 'tasks', 'create'], {
      queryParams: parentTaskId ? { parentTaskId } : undefined,
      state: { returnUrl: this.router.url },
    });
  }

  open(task: WorkTaskModel): void {
    void this.router.navigate([
      '/projects',
      this.projectId(),
      'tickets',
      task.workTicketId,
      'tasks',
      task.id,
    ]);
  }

  edit(task: WorkTaskModel, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(
      ['/projects', this.projectId(), 'tickets', task.workTicketId, 'tasks', task.id, 'edit'],
      { state: { returnUrl: this.router.url } },
    );
  }

  loadMore(): void {
    if (!this.hasMore() || !this.nextCursor() || this.loadingMore()) return;

    this.loadingMore.set(true);
    this.fetch(this.nextCursor())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe({
        next: (page) => {
          this.items.update((items) => [...items, ...page.items]);
          this.nextCursor.set(page.nextCursor);
          this.hasMore.set(page.hasMore);
        },
        error: () => this.loadError.set(true),
      });
  }

  retry(): void {
    this.reload.next();
  }

  private fetch(cursor: string | null) {
    const parentWorkTaskId = this.parentTaskId();

    return this.tasksService.getWorkTasks(this.projectId(), {
      ...(parentWorkTaskId
        ? { parentWorkTaskId }
        : { workTicketId: this.ticketId(), rootTasksOnly: true }),
      pageSize: 10,
      cursor,
    });
  }

  private delete(task: WorkTaskModel): void {
    this.tasksService
      .deleteWorkTask(this.projectId(), task.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.items.update((items) => items.filter((item) => item.id !== task.id));
          this.snackBar.success(`${task.isSubtask ? 'Subtask' : 'Task'} deleted.`);
        },
        error: (error: HttpErrorResponse) => this.snackBar.error(taskDeleteErrorMessage(error)),
      });
  }
}

function taskDeleteErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 400) {
    const errors = error.error?.errors as { error?: string }[] | undefined;
    const message = errors?.find((item) => item.error)?.error;
    if (message) return message;
  }
  return 'The task could not be deleted. Please try again.';
}
