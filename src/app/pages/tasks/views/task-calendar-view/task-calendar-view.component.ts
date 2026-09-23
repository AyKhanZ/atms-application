import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { WorkItemKind } from '../../../../core/models/work-items';
import { WorkTaskBoardQuery, deadlineOrder } from '../../../../core/models/work-task-board';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { WorkItemRefComponent } from '../../../../shared/components/work-item-ref/work-item-ref.component';
import { filterKey } from '../../tasks-page.utils';

interface Day {
  /** "2026-09-21", the local calendar date. */
  key: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  /** Saturday or Sunday, drawn a shade darker as in Notion. */
  weekend: boolean;
}

/** A day shows this many cards; the rest fold into "+ N more". */
const visiblePerDay = 3;

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * A month as a grid, the way Notion lays it out: each task on the day of its deadline. Moving a
 * card to another day moves the deadline. Months are paged with the arrows rather than scrolled,
 * so they never blur into each other and exactly one month is loaded. Work without a deadline is
 * not dropped silently: a line above the grid counts it and leads to the list.
 */
@Component({
  selector: 'app-task-calendar-view',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    WorkItemRefComponent,
  ],
  templateUrl: './task-calendar-view.component.html',
  styleUrl: './task-calendar-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCalendarViewComponent {
  private readonly store = inject(Store);
  private readonly phoneQuery =
    typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 767px)') : null;

  readonly query = input.required<WorkTaskBoardQuery>();
  /** "2026-09". */
  readonly month = input.required<string>();
  readonly canMove = input(false);
  readonly reloadToken = input(0);
  readonly monthChange = output<string>();
  readonly openTask = output<WorkTaskModel>();
  readonly showWithoutDeadline = output<void>();

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly isPhone = signal(this.phoneQuery?.matches ?? false);
  /** Days opened past their first three cards. */
  readonly expanded = signal<ReadonlySet<string>>(new Set());

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);
  private readonly counts = this.store.selectSignal(TaskBoardStoreSelectors.getCounts);

  private readonly firstDay = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    return new Date(year, month - 1, 1);
  });

  readonly monthName = computed(() =>
    this.firstDay().toLocaleDateString('en-US', { month: 'long' }),
  );
  readonly year = computed(() => this.firstDay().getFullYear());

  /** The month's deadlines, as the moments the form stores: local midnight, sent as UTC. */
  private readonly monthQuery = computed<WorkTaskBoardQuery>(() => {
    const first = this.firstDay();
    const next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    return { ...this.query(), deadlineFrom: first.toISOString(), deadlineTo: next.toISOString() };
  });

  private readonly key = computed(() => `calendar|${filterKey(this.monthQuery())}`);
  /** Undefined until the first request for these filters goes out. */
  readonly page = computed<TaskBoardPageState | undefined>(() => this.pages()[this.key()]);

  /** Whole weeks from the Monday on or before the 1st to the Sunday on or after the last day. */
  readonly weeks = computed<Day[][]>(() => {
    const first = this.firstDay();
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const today = dayKey(new Date());
    const weeks: Day[][] = [];
    for (const cursor = new Date(start); cursor <= last || cursor.getDay() !== 1; ) {
      const week: Day[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(cursor);
        week.push({
          key: dayKey(date),
          date,
          inMonth: date.getMonth() === first.getMonth(),
          today: dayKey(date) === today,
          weekend: i > 4,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  /** Tasks by the local day of their deadline. */
  readonly byDay = computed(() => {
    const days = new Map<string, WorkTaskModel[]>();
    for (const task of this.page()?.items ?? []) {
      if (!task.deadline) continue;
      const key = dayKey(new Date(task.deadline));
      days.set(key, [...(days.get(key) ?? []), task]);
    }
    return days;
  });

  /** Days of the month that have work, for the phone's agenda. */
  readonly agenda = computed(() =>
    this.weeks()
      .flat()
      .filter((day) => day.inMonth && (this.byDay().get(day.key)?.length ?? 0) > 0),
  );

  readonly withoutDeadline = computed(() =>
    Object.values(this.counts() ?? {}).reduce((sum, count) => sum + count, 0),
  );

  constructor() {
    const update = (event: MediaQueryListEvent) => this.isPhone.set(event.matches);
    this.phoneQuery?.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => this.phoneQuery?.removeEventListener('change', update));

    effect(() => {
      const key = this.key();
      const query = this.monthQuery();
      const noDeadline = { ...this.query(), noDeadline: true };
      this.reloadToken();
      untracked(() => {
        this.store.dispatch(TaskBoardStoreActions.loadAll({ key, query, order: deadlineOrder }));
        this.store.dispatch(TaskBoardStoreActions.loadCounts({ query: noDeadline }));
      });
    });
  }

  tasksOf(day: Day): WorkTaskModel[] {
    const tasks = this.byDay().get(day.key) ?? [];
    return this.expanded().has(day.key) ? tasks : tasks.slice(0, visiblePerDay);
  }

  hiddenCount(day: Day): number {
    const total = this.byDay().get(day.key)?.length ?? 0;
    return this.expanded().has(day.key) ? 0 : Math.max(0, total - visiblePerDay);
  }

  expand(day: Day): void {
    this.expanded.update((days) => new Set([...days, day.key]));
  }

  kind(task: WorkTaskModel): WorkItemKind {
    return task.isSubtask ? WorkItemKind.Subtask : WorkItemKind.Task;
  }

  done(task: WorkTaskModel): boolean {
    return task.status.id === WorkTaskStatus.Done;
  }

  overdue(task: WorkTaskModel): boolean {
    if (!task.deadline || this.done(task)) return false;
    const end = new Date(task.deadline);
    end.setHours(23, 59, 59, 999);
    return end.getTime() < Date.now();
  }

  step(months: number): void {
    const first = this.firstDay();
    const next = new Date(first.getFullYear(), first.getMonth() + months, 1);
    this.expanded.set(new Set());
    this.monthChange.emit(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  today(): void {
    const now = new Date();
    this.expanded.set(new Set());
    this.monthChange.emit(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }

  /** A card dropped on another day takes that day as its deadline, at the same local midnight the form uses. */
  drop(event: CdkDragDrop<Day, Day, WorkTaskModel>): void {
    const day = event.container.data;
    const task = event.item.data;
    if (event.previousContainer.data.key === day.key) return;
    const deadline = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate());
    this.store.dispatch(
      TaskBoardStoreActions.changeDeadline({
        task,
        from: this.key(),
        to: this.key(),
        deadline: deadline.toISOString(),
      }),
    );
  }
}
