import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NgTemplateOutlet } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import { BoardColumnModel } from '../../../../core/models/board-columns';
import { boardColumnStatusCode } from '../../../../core/utils/board-column.utils';
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
import { ScrollSentinelDirective } from '../../../../shared/directives/scroll-sentinel.directive';
import { filterKey } from '../../tasks-page.utils';

const pageSize = 20;
// past this a lane waits for a click: scrolling to find open work shouldnt pull hundreds of cards
const autoLoadLimit = 100;
// Done never loads on scroll and stops here, the rest is in the list: nobody reads an archive on a board
const doneLimit = 200;

// open column has two lanes (overdue on top, the rest), Done has one: closed work is never overdue
interface Lane {
  key: string;
  overdue: boolean | null;
}

interface Column {
  id: number;
  code: string;
  name: string;
  // with the status, for places without the group header (screen readers)
  label: string;
  category: number;
  statusCode: string;
  key: string;
  order: WorkTaskBoardOrder;
  lanes: Lane[];
}

// a status on the board: its header over one column, or over Doing and Done
interface Group {
  category: number;
  statusCode: string;
  name: string;
  columns: Column[];
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
    ScrollSentinelDirective,
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
  readonly columnsInput = input.required<BoardColumnModel[]>({ alias: 'columns' });
  readonly statuses = input<DictionaryModel[]>([]);
  readonly canMove = input(false);
  readonly showProject = input(false);
  readonly reloadToken = input(0);
  readonly showAllDone = output<void>();

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  readonly counts = this.store.selectSignal(TaskBoardStoreSelectors.getCounts);
  readonly dragging = signal(false);

  // every column, Done too while the Overdue filter hides it: a card can still be moved there
  private readonly allColumns = computed<Column[]>(() => {
    const filter = filterKey(this.query());
    const deadline = this.query().deadline;
    return this.columnsInput().map((column) => {
      const key = `board|${filter}|${column.id}`;
      const late: Lane = { key: `${key}|late`, overdue: true };
      const onTime: Lane = { key: `${key}|on-time`, overdue: false };
      const done = column.category === WorkTaskStatus.Done;
      return {
        id: column.id,
        code: column.code,
        name: column.name,
        label: column.label,
        category: column.category,
        statusCode: boardColumnStatusCode(column.category),
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

  // overdue work is open work, so that filter hides Done-category columns
  readonly columns = computed<Column[]>(() => {
    const { deadline } = this.query();
    return this.allColumns().filter(
      (column) => !(deadline === 'overdue' && column.category === WorkTaskStatus.Done),
    );
  });

  // columns come ordered by the server, a status's columns stand side by side
  readonly groups = computed<Group[]>(() => {
    const groups: Group[] = [];
    for (const column of this.columns()) {
      const last = groups.at(-1);
      if (last?.category === column.category) {
        last.columns.push(column);
        continue;
      }
      groups.push({
        category: column.category,
        statusCode: column.statusCode,
        name: this.statusName(column.category) ?? column.name,
        columns: [column],
      });
    }
    return groups;
  });

  // hidden column gives way to the first shown, so the phone never shows an empty board
  readonly phoneColumn = linkedSignal<Column[], number>({
    source: () => this.columns(),
    computation: (columns, previous) =>
      previous && columns.some((column) => column.id === previous.value)
        ? previous.value
        : (columns[0]?.id ?? WorkTaskStatus.New),
  });

  // phone: one tab per status, a split status shows its halves as a toggle under the tabs
  readonly phoneGroup = computed(() => this.groups().find((group) => this.hasPhoneColumn(group)));
  private readonly lastHalf = new Map<number, number>();

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

  // Done is the only lane without an overdue part
  private byClick(lane: Lane): boolean {
    return lane.overdue === null || (this.page(lane)?.items.length ?? 0) >= autoLoadLimit;
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

  // a page arriving mid-drag would shift the cards under the pointer
  canLoadMore(lane: Lane): boolean {
    const page = this.page(lane);
    return (
      !!page?.nextCursor && !page.loading && !page.error && !this.dragging() && !this.byClick(lane)
    );
  }

  // stays while dragging: a button vanishing under the dragged card would jump the column
  canShowMore(lane: Lane): boolean {
    const page = this.page(lane);
    return (
      !!page?.nextCursor &&
      !page.loading &&
      !page.error &&
      this.byClick(lane) &&
      !this.showsAllDone(lane)
    );
  }

  showsAllDone(lane: Lane): boolean {
    const page = this.page(lane);
    return lane.overdue === null && !!page?.nextCursor && page.items.length >= doneLimit;
  }

  loadMore(column: Column, lane: Lane): void {
    const page = this.page(lane);
    if (page?.nextCursor && !page.loading) this.load(column, lane, page.nextCursor);
  }

  // no cursor yet = the first page failed
  retry(column: Column, lane: Lane): void {
    this.load(column, lane, this.page(lane)?.nextCursor ?? null);
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

  moveTo(task: WorkTaskModel, from: Lane, columnId: number): void {
    const to = this.allColumns().find((column) => column.id === columnId);
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
    const closing = to.category === WorkTaskStatus.Done && task.status.id !== WorkTaskStatus.Done;
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
    const target = to.category === WorkTaskStatus.Done || lane.key !== aimed?.key ? 0 : index;
    const neighbours =
      to.category === WorkTaskStatus.Done
        ? []
        : (this.page(lane)?.items ?? []).filter((item) => item.id !== task.id);
    this.store.dispatch(
      TaskBoardStoreActions.moveTask({
        task,
        from: from.key,
        to: lane.key,
        index: target,
        status: { id: to.category, code: to.statusCode, name: this.statusName(to.category) ?? to.name },
        boardColumn: { id: to.id, code: to.code, name: to.name },
        previousWorkTaskId: neighbours[target - 1]?.id ?? null,
        nextWorkTaskId: neighbours[target]?.id ?? null,
        completeSubtasks,
      }),
    );
  }

  // a status takes as much width as it has columns
  boardTemplate(): string {
    const groups = this.groups();
    // still loading: the outline already has the board's proportions, so nothing jumps when it arrives
    if (groups.length === 0) return 'minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr)';
    return groups.map((group) => `minmax(0, ${group.columns.length}fr)`).join(' ');
  }

  // the tab row scrolls sideways on a phone: bring the picked tab fully into view
  // back to a split status: the half that was open there, not always Doing
  pickPhoneGroup(group: Group, event: Event): void {
    const last = this.lastHalf.get(group.category);
    const column = group.columns.find((candidate) => candidate.id === last) ?? group.columns[0];
    if (column) this.phoneColumn.set(column.id);
    (event.currentTarget as HTMLElement | null)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  pickPhoneHalf(group: Group, column: Column): void {
    this.lastHalf.set(group.category, column.id);
    this.phoneColumn.set(column.id);
  }

  hasPhoneColumn(group: Group): boolean {
    return group.columns.some((column) => column.id === this.phoneColumn());
  }

  groupCount(group: Group): number {
    const counts = this.counts();
    return group.columns.reduce((sum, column) => sum + (counts?.[column.id] ?? 0), 0);
  }

  private statusName(category: number): string | undefined {
    return this.statuses().find((status) => status.id === category)?.name;
  }

  private load(column: Column, lane: Lane, cursor: string | null): void {
    this.store.dispatch(
      TaskBoardStoreActions.loadPage({
        key: lane.key,
        query: {
          ...this.query(),
          boardColumnIds: [column.id],
          ...(lane.overdue === null ? {} : { overdue: lane.overdue }),
        },
        order: column.order,
        pageSize,
        cursor,
      }),
    );
  }
}
