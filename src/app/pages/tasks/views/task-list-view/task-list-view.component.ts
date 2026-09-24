import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  linkedSignal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { SortEvent } from 'primeng/api';
import { TableModule } from 'primeng/table';
import {
  WorkTaskBoardOrder,
  WorkTaskBoardQuery,
  WorkTaskBoardSort,
  orderKey,
} from '../../../../core/models/work-task-board';
import { SortDirectionEnum } from '../../../../core/enums/sort-direction.enum';
import { LayoutService } from '../../../../core/services/layout.service';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { WorkItemAssigneeComponent } from '../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { OverdueBadgeComponent } from '../../../../shared/components/overdue-badge/overdue-badge.component';
import { IsOverdueTaskPipe, TaskKindPipe } from '../../../../shared/pipes/work-task.pipe';
import { TaskListRowComponent } from '../../components/task-list-row/task-list-row.component';
import { TaskStatusBadgeComponent } from '../../../projects/tasks/components/task-status-badge/task-status-badge.component';
import { defaultListOrder, filterKey } from '../../tasks-page.utils';

const pageSize = 20;

/** One part of the list: overdue work, or everything else. */
interface ListSource {
  key: string;
  overdue: boolean;
}

const sorts: Record<string, WorkTaskBoardSort> = {
  code: WorkTaskBoardSort.Code,
  title: WorkTaskBoardSort.Title,
  state: WorkTaskBoardSort.State,
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
    TableModule,
    EmptyStateComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
    WorkItemRefComponent,
    TaskStatusBadgeComponent,
    OverdueBadgeComponent,
    TaskListRowComponent,
    TaskKindPipe,
    IsOverdueTaskPipe,
  ],
  templateUrl: './task-list-view.component.html',
  styleUrl: './task-list-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskListViewComponent {
  private readonly store = inject(Store);
  /** A phone has no room for six columns: two-line rows instead of the table. */
  readonly isPhone = inject(LayoutService).isPhone;

  readonly query = input.required<WorkTaskBoardQuery>();
  readonly reloadToken = input(0);
  /** What an empty list says, chosen by the page from its filters. */
  readonly emptyText = input('No tasks yet');
  readonly openTask = output<WorkTaskModel>();
  readonly order = input<WorkTaskBoardOrder>(defaultListOrder);
  readonly orderChange = output<WorkTaskBoardOrder>();
  readonly sortField = computed(
    () => Object.keys(sorts).find((field) => sorts[field] === this.order().sort) ?? 'title',
  );
  readonly sortOrder = computed(() => (this.order().direction === SortDirectionEnum.Desc ? -1 : 1));

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  private readonly key = computed(
    () => `list|${filterKey(this.query())}|${orderKey(this.order())}`,
  );
  /** Overdue work first, then the rest, each in the chosen order — whatever column sorts it.
   *  A deadline filter leaves only one of the two. */
  private readonly sources = computed<ListSource[]>(() => {
    const key = this.key();
    const deadline = this.query().deadline;
    const late: ListSource = { key: `${key}|late`, overdue: true };
    const onTime: ListSource = { key: `${key}|on-time`, overdue: false };
    return deadline === 'overdue' ? [late] : deadline === 'none' ? [onTime] : [late, onTime];
  });
  /** Both sources read as one list: the rest shows only once the overdue part is all loaded.
   *  Undefined until the first request for these filters goes out. */
  readonly page = computed<TaskBoardPageState | undefined>(() => {
    const pages = this.sources().map((source) => this.pages()[source.key]);
    if (pages.some((page) => !page)) return undefined;
    const loaded = pages as TaskBoardPageState[];
    const unfinished = loaded.findIndex((page) => page.hasMore);
    const shown = unfinished === -1 ? loaded : loaded.slice(0, unfinished + 1);
    return {
      items: shown.flatMap((page) => page.items),
      nextCursor: null,
      hasMore: loaded.some((page) => page.hasMore),
      loading: loaded.some((page) => page.loading),
      error: loaded.find((page) => page.error)?.error ?? null,
    };
  });
  private readonly displayed = linkedSignal<
    { filter: string; page: TaskBoardPageState | undefined },
    { filter: string; items: WorkTaskModel[] }
  >({
    source: () => ({ filter: filterKey(this.query()), page: this.page() }),
    computation: ({ filter, page }, previous) => ({
      filter,
      // Keep rows only while reordering the same result set, never across a filter/access change.
      items:
        page && (!page.loading || page.items.length > 0)
          ? page.items
          : previous?.value.filter === filter
            ? previous.value.items
            : [],
    }),
  });
  readonly items = computed(() => this.displayed().items);
  readonly loading = computed(() => this.page()?.loading ?? !this.page());

  constructor() {
    effect(() => {
      this.key();
      this.reloadToken();
      untracked(() => this.loadFirst());
    });
  }

  changeSort(event: SortEvent): void {
    const field = typeof event.field === 'string' ? event.field : null;
    if (!field || !sorts[field]) return;
    const direction = event.order === -1 ? SortDirectionEnum.Desc : SortDirectionEnum.Asc;
    if (sorts[field] !== this.order().sort || direction !== this.order().direction) {
      this.orderChange.emit({ sort: sorts[field], direction });
    }
  }

  trackRow(_index: number, task: WorkTaskModel): string {
    return task.id;
  }

  /** The next page of the overdue part while it has more, then of the rest. */
  loadMore(): void {
    const source = this.sources().find((candidate) => this.pages()[candidate.key]?.hasMore);
    const page = source && this.pages()[source.key];
    if (source && page?.nextCursor && !page.loading) this.load(source, page.nextCursor);
  }

  private loadFirst(): void {
    const keys = this.sources().map((source) => source.key);
    this.store.dispatch(TaskBoardStoreActions.keepPages({ keys }));
    for (const source of this.sources()) this.load(source, null);
  }

  private load(source: ListSource, cursor: string | null): void {
    this.store.dispatch(
      TaskBoardStoreActions.loadPage({
        key: source.key,
        query: { ...this.query(), overdue: source.overdue },
        order: this.order(),
        pageSize,
        cursor,
      }),
    );
  }
}
