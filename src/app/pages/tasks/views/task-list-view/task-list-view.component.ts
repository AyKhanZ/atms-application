import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { ButtonModule } from 'primeng/button';
import { SortEvent } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { WorkItemKind } from '../../../../core/models/work-items';
import {
  WorkTaskBoardOrder,
  WorkTaskBoardQuery,
  WorkTaskBoardSort,
  orderKey,
} from '../../../../core/models/work-task-board';
import { SortDirectionEnum } from '../../../../core/enums/sort-direction.enum';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { ClearButtonComponent } from '../../../../shared/components/clear-button/clear-button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { TaskStatusBadgeComponent } from '../../../projects/tasks/components/task-status-badge/task-status-badge.component';
import { filterKey } from '../../tasks-page.utils';

const pageSize = 20;

/** What each sortable column of the table orders by. Task is the board's own order, so one click
 *  on it always leads back to the familiar view. */
const sorts: Record<string, WorkTaskBoardSort> = {
  task: WorkTaskBoardSort.Rank,
  deadline: WorkTaskBoardSort.Deadline,
  priority: WorkTaskBoardSort.Priority,
};

/**
 * Everything the filters let through, one row each — subtasks as rows of their own, not tucked
 * under their task, so every filter and order treats them alike. The only view that shows work
 * without a deadline and reads well on a phone. The table is the one the other lists use, so a
 * row, a header and a sort arrow behave here exactly as they do in Projects and Users.
 */
@Component({
  selector: 'app-task-list-view',
  imports: [
    DatePipe,
    ButtonModule,
    TableModule,
    ClearButtonComponent,
    EmptyStateComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
    WorkItemRefComponent,
    TaskStatusBadgeComponent,
  ],
  templateUrl: './task-list-view.component.html',
  styleUrl: './task-list-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListViewComponent {
  private readonly store = inject(Store);

  readonly query = input.required<WorkTaskBoardQuery>();
  readonly showProject = input(false);
  readonly reloadToken = input(0);
  /** What an empty list says, chosen by the page from its filters. */
  readonly emptyText = input('No tasks yet');
  /** Whether filters are in use, so an empty list offers to clear them. */
  readonly filtered = input(false);
  readonly openTask = output<WorkTaskModel>();
  readonly clearFilters = output<void>();

  /** Which column orders the rows; the board's own order to begin with. */
  readonly sortField = signal('task');
  readonly sortOrder = signal(1);
  readonly order = computed<WorkTaskBoardOrder>(() => ({
    sort: sorts[this.sortField()] ?? WorkTaskBoardSort.Rank,
    direction: this.sortOrder() === -1 ? SortDirectionEnum.Desc : SortDirectionEnum.Asc,
  }));

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  private readonly key = computed(
    () => `list|${filterKey(this.query())}|${orderKey(this.order())}`,
  );
  /** Undefined until the first request for these filters goes out. */
  readonly page = computed<TaskBoardPageState | undefined>(() => this.pages()[this.key()]);
  readonly items = computed(() => this.page()?.items ?? []);
  readonly loading = computed(() => this.page()?.loading ?? !this.page());

  constructor() {
    effect(() => {
      this.key();
      this.reloadToken();
      untracked(() => this.load(null));
    });
  }

  changeSort(event: SortEvent): void {
    const field = typeof event.field === 'string' ? event.field : null;
    if (!field || !sorts[field]) return;
    this.sortField.set(field);
    this.sortOrder.set(event.order === -1 ? -1 : 1);
  }

  kind(task: WorkTaskModel): WorkItemKind {
    return task.isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task;
  }

  location(task: WorkTaskModel): string {
    const place = task.isSubtask
      ? `#${task.parentWorkTask?.code} ${task.parentWorkTask?.name}`
      : `#${task.workTicket.code} ${task.workTicket.name}`;
    return this.showProject() && task.workProjectTitle
      ? `${task.workProjectTitle} › ${place}`
      : place;
  }

  overdue(task: WorkTaskModel): boolean {
    if (!task.deadline || task.status.id === WorkTaskStatus.Done) return false;
    const end = new Date(task.deadline);
    end.setHours(23, 59, 59, 999);
    return end.getTime() < Date.now();
  }

  loadMore(): void {
    const page = this.page();
    if (page?.nextCursor && !page.loading) this.load(page.nextCursor);
  }

  private load(cursor: string | null): void {
    this.store.dispatch(
      TaskBoardStoreActions.loadPage({
        key: this.key(),
        query: this.query(),
        order: this.order(),
        pageSize,
        cursor,
      }),
    );
  }
}
