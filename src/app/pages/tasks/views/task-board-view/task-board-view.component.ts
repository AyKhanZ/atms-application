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
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
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
import {
  askToCloseOpenWork,
  workItemRef,
} from '../../../../shared/components/confirm-dialog/close-open-work';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadMoreButtonComponent } from '../../../../shared/components/load-more-button/load-more-button.component';
import { filterKey } from '../../tasks-page.utils';

const pageSize = 20;

// open column has two lanes (overdue on top, the rest), Done has one: closed work is never overdue
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

// menu does the same as drag for keyboard and phones; Done is by close date so a drop goes on top
// overdue cards cant be dragged across the line, they leave the group when the deadline changes or they close
@Component({
  selector: 'app-task-board-view',
  imports: [
    NgTemplateOutlet,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    SkeletonModule,
    TaskCardComponent,
    TranslocoDirective,
    EmptyStateComponent,
    LoadMoreButtonComponent,
  ],
  templateUrl: './task-board-view.component.html',
  styleUrl: './task-board-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskBoardViewComponent {
  private readonly store = inject(Store);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  readonly query = input.required<WorkTaskBoardQuery>();
  readonly statuses = input.required<DictionaryModel[]>();
  readonly canMove = input(false);
  readonly showProject = input(false);
  readonly reloadToken = input(0);
  readonly openTask = output<WorkTaskModel>();

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  readonly counts = this.store.selectSignal(TaskBoardStoreSelectors.getCounts);

  // every status, shown or not: a card can be moved into a hidden one
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

  // overdue work is open work, so that filter hides Done too
  readonly columns = computed<Column[]>(() => {
    const { statusIds, deadline } = this.query();
    return this.allColumns().filter(
      (column) =>
        (statusIds.length === 0 || statusIds.includes(column.status.id)) &&
        !(deadline === 'overdue' && column.status.id === WorkTaskStatus.Done),
    );
  });

  // hidden column gives way to the first shown, so the phone never shows an empty board
  readonly phoneColumn = linkedSignal<Column[], number>({
    source: () => this.columns(),
    computation: (columns, previous) =>
      previous && columns.some((column) => column.status.id === previous.value)
        ? previous.value
        : (columns[0]?.status.id ?? WorkTaskStatus.New),
  });

  // overdue only among overdue, the rest below; column without overdue: drop anywhere, goes on top
  readonly acceptsLate = (drag: CdkDrag<WorkTaskModel>): boolean =>
    daysLate(drag.data.deadline) > 0;
  readonly acceptsOnTime = (drag: CdkDrag<WorkTaskModel>, drop: CdkDropList<Drop>): boolean =>
    daysLate(drag.data.deadline) === 0 || !this.hasLate(drop.data.column);
  readonly acceptsAny = (): boolean => true;

  constructor() {
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

  // overdue lane only if it has work, or failed (the error must show)
  shownLanes(column: Column): Lane[] {
    return column.lanes.length > 1
      ? column.lanes.filter(
          (lane) => !lane.overdue || this.hasLate(column) || !!this.page(lane)?.error,
        )
      : column.lanes;
  }

  grouped(column: Column): boolean {
    return this.shownLanes(column).length > 1;
  }

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
    // Done is by close date, reordering inside it would show an order nobody saves
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
      const choice = await askToCloseOpenWork(this.confirmation, this.transloco, {
        key: 'taskBoardClose',
        itemRef: workItemRef(this.transloco, 'workItem.kind.task', task.code),
        title: task.title,
        openCount: openSubtasks,
        child: 'subtask',
      });
      if (choice === 'cancel') return;
      completeSubtasks = choice === 'all';
    }

    // deadline decides the group, not the drop position
    const late = daysLate(task.deadline) > 0;
    const lane = to.lanes.find((candidate) => candidate.overdue === late) ?? to.lanes[0];
    const target = to.status.id === WorkTaskStatus.Done || lane.key !== aimed?.key ? 0 : index;
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
