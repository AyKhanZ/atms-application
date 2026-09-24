import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  untracked,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { NgTemplateOutlet } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import {
  WorkTaskBoardOrder,
  WorkTaskBoardQuery,
  boardOrder,
  doneOrder,
} from '../../../../core/models/work-task-board';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import { daysLate } from '../../../../core/utils/deadline.utils';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { askToCloseOpenWork } from '../../../../shared/components/confirm-dialog/close-open-work';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { filterKey } from '../../tasks-page.utils';

const pageSize = 20;

/**
 * One list inside a column. An open column has two: overdue work on top, the rest below, each in
 * its own manual order. Done has one, `overdue: null`: closed work is never overdue.
 */
interface Lane {
  key: string;
  overdue: boolean | null;
}

interface Column {
  status: DictionaryModel;
  key: string;
  order: WorkTaskBoardOrder;
  lanes: Lane[];
}

interface Drop {
  column: Column;
  lane: Lane;
}

/**
 * Three columns by status. A card is dragged within a column to reorder it and across columns to
 * change its status; the menu on every card does the same for the keyboard and for phones, where
 * dragging with a finger is unreliable. Done is ordered by when things were closed, freshest on
 * top, so a drop there lands on top whatever spot it was aimed at.
 *
 * Overdue work sits on top of New and In Progress, above a dashed line. A card cannot be
 * dragged across that line: it leaves the group when its deadline changes or it is closed, not
 * because someone ranked it lower.
 */
@Component({
  selector: 'app-task-board-view',
  imports: [
    NgTemplateOutlet,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    SkeletonModule,
    TaskCardComponent,
    EmptyStateComponent,
  ],
  templateUrl: './task-board-view.component.html',
  styleUrl: './task-board-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBoardViewComponent {
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);

  readonly query = input.required<WorkTaskBoardQuery>();
  /** Task statuses from the dictionary, in their order. */
  readonly statuses = input.required<DictionaryModel[]>();
  readonly canMove = input(false);
  /** Cards name their project: the page shows more than one. */
  readonly showProject = input(false);
  /** Changes whenever the page wants everything reloaded — after a failed move, for one. */
  readonly reloadToken = input(0);
  readonly openTask = output<WorkTaskModel>();

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  readonly counts = this.store.selectSignal(TaskBoardStoreSelectors.getCounts);

  /** A column for every status, shown or not: a card can be moved into one the filter hides. */
  private readonly allColumns = computed<Column[]>(() => {
    const filter = filterKey(this.query());
    const deadline = this.query().deadline;
    return this.statuses().map((status) => {
      const key = `board|${filter}|${status.id}`;
      const late: Lane = { key: `${key}|late`, overdue: true };
      const onTime: Lane = { key: `${key}|on-time`, overdue: false };
      const done = status.id === WorkTaskStatus.Done;
      return {
        status,
        key,
        order: done ? doneOrder : boardOrder,
        lanes: done
          ? [{ key, overdue: null }]
          : deadline === 'overdue'
            ? [late]
            : deadline === 'none'
              ? [onTime]
              : [late, onTime],
      };
    });
  });

  /** The columns shown: all three, or the ones the State filter keeps. Overdue work is open work
   *  by definition, so that filter leaves Done out too. */
  readonly columns = computed<Column[]>(() => {
    const { statusIds, deadline } = this.query();
    return this.allColumns().filter(
      (column) =>
        (statusIds.length === 0 || statusIds.includes(column.status.id)) &&
        !(deadline === 'overdue' && column.status.id === WorkTaskStatus.Done),
    );
  });

  /** On a phone one column at a time; this is which. A column the Status filter hides gives way to
   *  the first one shown, so the phone never shows a board with nothing on it. */
  readonly phoneColumn = linkedSignal<Column[], number>({
    source: () => this.columns(),
    computation: (columns, previous) =>
      previous && columns.some((column) => column.status.id === previous.value)
        ? previous.value
        : (columns[0]?.status.id ?? WorkTaskStatus.New),
  });

  /** An overdue card only goes among overdue cards, anything else only below them. A column with
   *  no overdue work has no place above the line, so there an overdue card drops anywhere and
   *  goes on top after the drop. */
  readonly acceptsLate = (drag: CdkDrag<WorkTaskModel>): boolean =>
    daysLate(drag.data.deadline) > 0;
  readonly acceptsOnTime = (drag: CdkDrag<WorkTaskModel>, drop: CdkDropList<Drop>): boolean =>
    daysLate(drag.data.deadline) === 0 || !this.hasLate(drop.data.column);
  readonly acceptsAny = (): boolean => true;

  constructor() {
    // Every list loads its first page when the filters change or the page asks to reload.
    effect(() => {
      const columns = this.columns();
      const query = this.query();
      this.reloadToken();
      untracked(() => {
        const keys = columns.flatMap((column) => column.lanes.map((lane) => lane.key));
        this.store.dispatch(TaskBoardStoreActions.keepPages({ keys }));
        for (const column of columns) {
          for (const lane of column.lanes) this.load(column, lane, null);
        }
        this.store.dispatch(TaskBoardStoreActions.loadCounts({ query }));
      });
    });
  }

  page(lane: Lane): TaskBoardPageState | undefined {
    return this.pages()[lane.key];
  }

  /** The lanes drawn: the overdue one only in a column that has overdue work, or that could not
   *  be read — its error must show, not an empty-looking column. */
  shownLanes(column: Column): Lane[] {
    return column.lanes.length > 1
      ? column.lanes.filter(
          (lane) => !lane.overdue || this.hasLate(column) || !!this.page(lane)?.error,
        )
      : column.lanes;
  }

  /** Overdue work on top and the rest below, split by a line. */
  grouped(column: Column): boolean {
    return this.shownLanes(column).length > 1;
  }

  /** Still reading any of the column's lists: the skeleton, not an empty column. */
  loading(column: Column): boolean {
    return column.lanes.some((lane) => !this.page(lane) || this.page(lane)?.loading);
  }

  private hasLate(column: Column): boolean {
    return column.lanes.some((lane) => lane.overdue && (this.page(lane)?.items.length ?? 0) > 0);
  }

  empty(column: Column): boolean {
    return column.lanes.every((lane) => {
      const page = this.page(lane);
      return !!page && !page.loading && !page.error && page.items.length === 0;
    });
  }

  loadMore(column: Column, lane: Lane): void {
    const page = this.page(lane);
    if (page?.nextCursor && !page.loading) this.load(column, lane, page.nextCursor);
  }

  drop(event: CdkDragDrop<Drop, Drop, WorkTaskModel>): void {
    const from = event.previousContainer.data;
    const to = event.container.data;
    // Done is ordered by close date: reordering within it would show an order nobody saves.
    if (
      from.lane.key === to.lane.key &&
      (to.lane.overdue === null || event.previousIndex === event.currentIndex)
    )
      return;
    void this.move(event.item.data, from.lane, to.column, to.lane, event.currentIndex);
  }

  moveTo(task: WorkTaskModel, from: Lane, statusId: WorkTaskStatus): void {
    const to = this.allColumns().find((column) => column.status.id === statusId);
    if (to) void this.move(task, from, to, null, 0);
  }

  moveToTop(task: WorkTaskModel, column: Column, lane: Lane): void {
    void this.move(task, lane, column, lane, 0);
  }

  private async move(
    task: WorkTaskModel,
    from: Lane,
    to: Column,
    aimed: Lane | null,
    index: number,
  ): Promise<void> {
    const closing = to.status.id === WorkTaskStatus.Done && task.status.id !== WorkTaskStatus.Done;
    const openSubtasks = task.subtaskCount - task.doneSubtaskCount;
    let completeSubtasks = false;
    if (closing && openSubtasks > 0) {
      const choice = await askToCloseOpenWork(this.confirmation, {
        key: 'taskBoardClose',
        itemRef: `TASK #${task.code}`,
        title: task.title,
        openCount: openSubtasks,
        childLabel: 'subtask',
      });
      if (choice === 'cancel') return;
      completeSubtasks = choice === 'all';
    }

    // The card's deadline, not the drop, decides the group. Dropped where it does not belong —
    // reopened from Done, or moved from the menu — it goes on top of the group it belongs to.
    const late = daysLate(task.deadline) > 0;
    const lane = to.lanes.find((candidate) => candidate.overdue === late) ?? to.lanes[0];
    // Done keeps its own order, by close date: a card dropped there goes on top.
    const target = to.status.id === WorkTaskStatus.Done || lane.key !== aimed?.key ? 0 : index;
    // Done is ordered by close date, not by rank: no neighbours to place the card between.
    const neighbours =
      to.status.id === WorkTaskStatus.Done
        ? []
        : (this.page(lane)?.items ?? []).filter((item) => item.id !== task.id);
    this.store.dispatch(
      TaskBoardStoreActions.moveTask({
        task,
        from: from.key,
        to: lane.key,
        index: target,
        status: to.status,
        previousWorkTaskId: neighbours[target - 1]?.id ?? null,
        nextWorkTaskId: neighbours[target]?.id ?? null,
        completeSubtasks,
      }),
    );
  }

  private load(column: Column, lane: Lane, cursor: string | null): void {
    this.store.dispatch(
      TaskBoardStoreActions.loadPage({
        key: lane.key,
        query: {
          ...this.query(),
          statusIds: [column.status.id],
          ...(lane.overdue === null ? {} : { overdue: lane.overdue }),
        },
        order: column.order,
        pageSize,
        cursor,
      }),
    );
  }
}
