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
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { ConfirmationService } from 'primeng/api';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DictionaryModel } from '../../../../core/models/dictionary.model';
import {
  WorkTaskBoardOrder,
  WorkTaskBoardQuery,
  boardOrder,
  doneOrder
} from '../../../../core/models/work-task-board';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { askToCloseOpenWork } from '../../../../shared/components/confirm-dialog/close-open-work';
import { TaskCardComponent } from '../../components/task-card/task-card.component';
import { filterKey } from '../../tasks-page.utils';

const pageSize = 20;

interface Column {
  status: DictionaryModel;
  key: string;
  order: WorkTaskBoardOrder;
}

/**
 * Three columns by status. A card is dragged within a column to reorder it and across columns to
 * change its status; the menu on every card does the same for the keyboard and for phones, where
 * dragging with a finger is unreliable. Done is ordered by when things were closed, freshest on
 * top, so a drop there lands on top whatever spot it was aimed at.
 */
@Component({
  selector: 'app-task-board-view',
  imports: [
    NgTemplateOutlet,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    ButtonModule,
    SkeletonModule,
    TaskCardComponent,
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
  readonly showProject = input(false);
  /** Changes whenever the page wants everything reloaded — after a failed move, for one. */
  readonly reloadToken = input(0);
  readonly openTask = output<WorkTaskModel>();

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  readonly counts = this.store.selectSignal(TaskBoardStoreSelectors.getCounts);

  /** On a phone one column at a time; this is which. */
  readonly phoneColumn = signal<number>(WorkTaskStatus.New);

  /** A column for every status, shown or not: a card can be moved into one the filter hides. */
  private readonly allColumns = computed<Column[]>(() => {
    const key = filterKey(this.query());
    return this.statuses().map((status) => ({
      status,
      key: `board|${key}|${status.id}`,
      order: status.id === WorkTaskStatus.Done ? doneOrder : boardOrder,
    }));
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

  constructor() {
    // Every column loads its first page when the filters change or the page asks to reload.
    effect(() => {
      const columns = this.columns();
      const query = this.query();
      this.reloadToken();
      untracked(() => {
        for (const column of columns) this.load(column, null);
        this.store.dispatch(TaskBoardStoreActions.loadCounts({ query }));
      });
    });
  }

  page(column: Column): TaskBoardPageState | undefined {
    return this.pages()[column.key];
  }

  loadMore(column: Column): void {
    const page = this.page(column);
    if (page?.nextCursor && !page.loading) this.load(column, page.nextCursor);
  }

  drop(event: CdkDragDrop<Column, Column, WorkTaskModel>): void {
    const from = event.previousContainer.data;
    const to = event.container.data;
    if (from.key === to.key && event.previousIndex === event.currentIndex) return;
    void this.move(event.item.data, from, to, event.currentIndex);
  }

  moveTo(task: WorkTaskModel, from: Column, statusId: WorkTaskStatus): void {
    const to = this.allColumns().find((column) => column.status.id === statusId);
    if (to) void this.move(task, from, to, 0);
  }

  moveToTop(task: WorkTaskModel, column: Column): void {
    void this.move(task, column, column, 0);
  }

  private async move(task: WorkTaskModel, from: Column, to: Column, index: number): Promise<void> {
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

    // Done keeps its own order, by close date: a card dropped there goes on top.
    const target = to.status.id === WorkTaskStatus.Done ? 0 : index;
    const neighbours = (this.page(to)?.items ?? []).filter((item) => item.id !== task.id);
    this.store.dispatch(
      TaskBoardStoreActions.moveTask({
        task,
        from: from.key,
        to: to.key,
        index: target,
        status: to.status,
        previousWorkTaskId: neighbours[target - 1]?.id ?? null,
        nextWorkTaskId: neighbours[target]?.id ?? null,
        completeSubtasks,
      }),
    );
  }

  private load(column: Column, cursor: string | null): void {
    this.store.dispatch(
      TaskBoardStoreActions.loadPage({
        key: column.key,
        query: { ...this.query(), statusIds: [column.status.id] },
        order: column.order,
        pageSize,
        cursor,
      }),
    );
  }
}
