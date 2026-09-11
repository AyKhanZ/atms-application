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

import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { Subject, catchError, finalize, merge, of, switchMap, tap } from 'rxjs';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';

import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { WorkItemAssigneeComponent } from '../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-work-task-list',
  imports: [
    ButtonModule,
    MenuModule,
    EmptyStateComponent,
    WorkItemAssigneeComponent,
    TaskStatusBadgeComponent,
  ],

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

  private readonly tasksService = inject(WorkTasksService);

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

  readonly selectedTask = signal<WorkTaskModel | null>(null);
  readonly taskActions = computed<MenuItem[]>(() => {
    const task = this.selectedTask();
    return task && this.canEdit()
      ? [{ label: 'Edit', icon: 'pi pi-pencil', command: () => this.edit(task) }]
      : [];
  });

  openMenu(event: Event, task: WorkTaskModel, menu: Menu): void {
    if (!this.canEdit()) return;
    this.selectedTask.set(task);
    menu.toggle(event);
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

  edit(task: WorkTaskModel): void {
    if (!this.canEdit()) return;
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
}
