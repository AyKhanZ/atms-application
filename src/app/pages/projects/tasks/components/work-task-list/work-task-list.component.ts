import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { WorkTaskFilter, WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTasksStoreActions, WorkTasksStoreSelectors } from '../../../../../store/work-tasks';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { WorkItemAssigneeComponent } from '../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemKind } from '../../../../../core/models/work-items';

@Component({
  selector: 'app-work-task-list',
  imports: [
    WorkItemRefComponent,
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
export class WorkTaskListComponent implements OnDestroy {
  protected readonly kinds = WorkItemKind;
  readonly projectId = input.required<string>();
  readonly ticketId = input<string | null>(null);
  readonly parentTaskId = input<string | null>(null);
  readonly canCreate = input(false);
  readonly canEdit = input(false);

  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly taskPages = this.store.selectSignal(WorkTasksStoreSelectors.getPages);

  /**
   * The list is reused for a ticket's tasks and for a task's subtasks, and both are reached by
   * navigating between items on the same route. Angular reuses the component in that case, so the
   * first page has to follow the inputs rather than a one-off ngOnInit call.
   */
  private readonly queryKey = computed(
    () => `${this.projectId()}|${this.ticketId() ?? ''}|${this.parentTaskId() ?? ''}`,
  );
  private readonly page = computed(() => this.taskPages()[this.queryKey()]);
  readonly items = computed(() => this.page()?.items ?? []);
  readonly loading = computed(() => this.page()?.loading ?? true);
  readonly loadingMore = computed(() => this.loading() && this.items().length > 0);
  readonly loadError = computed(
    () => this.page()?.error !== null && this.page()?.error !== undefined,
  );
  readonly nextCursor = computed(() => this.page()?.nextCursor ?? null);
  readonly hasMore = computed(() => this.page()?.hasMore ?? false);

  constructor() {
    effect(() => {
      const requestKey = this.queryKey();
      this.store.dispatch(
        WorkTasksStoreActions.loadTasks({
          requestKey,
          projectId: this.projectId(),
          filter: this.filter(null),
          append: false,
        }),
      );
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(WorkTasksStoreActions.clearPage({ requestKey: this.queryKey() }));
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

    this.store.dispatch(
      WorkTasksStoreActions.loadTasks({
        requestKey: this.queryKey(),
        projectId: this.projectId(),
        filter: this.filter(this.nextCursor()),
        append: true,
      }),
    );
  }

  retry(): void {
    this.store.dispatch(
      WorkTasksStoreActions.loadTasks({
        requestKey: this.queryKey(),
        projectId: this.projectId(),
        filter: this.filter(null),
        append: false,
      }),
    );
  }

  private filter(cursor: string | null): WorkTaskFilter {
    const parentWorkTaskId = this.parentTaskId();
    return {
      ...(parentWorkTaskId
        ? { parentWorkTaskId }
        : { workTicketId: this.ticketId(), rootTasksOnly: true }),
      pageSize: 10,
      cursor,
    };
  }
}
