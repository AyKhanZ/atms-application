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
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { WorkTaskBoardQuery, deadlineOrder } from '../../../../core/models/work-task-board';
import { WorkTaskModel } from '../../../../core/models/work-tasks';
import { WorkTaskStatus } from '../../../../core/enums/work-task-status.enum';
import {
  TaskBoardPageState,
  TaskBoardStoreActions,
  TaskBoardStoreSelectors,
} from '../../../../store/task-board';
import { isOverdueTask } from '../../../../core/utils/deadline.utils';
import { LayoutService } from '../../../../core/services/layout.service';
import { TaskCalendarChipComponent } from '../../components/task-calendar-chip/task-calendar-chip.component';
import { filterKey } from '../../tasks-page.utils';
import { CalendarDayCapacityDirective } from './calendar-day-capacity.directive';

interface Day {
  /** "2026-09-21", the local calendar date. */
  key: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  /** Saturday or Sunday, drawn a shade darker as in Notion. */
  weekend: boolean;
}

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * A month as a grid, the way Notion lays it out: each task on the day of its deadline. Moving a
 * card to another day moves the deadline. Months are paged with the arrows rather than scrolled,
 * so they never blur into each other and exactly one month is loaded.
 */
@Component({
  selector: 'app-task-calendar-view',
  imports: [
    DatePipe,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CalendarDayCapacityDirective,
    TaskCalendarChipComponent,
  ],
  templateUrl: './task-calendar-view.component.html',
  styleUrl: './task-calendar-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCalendarViewComponent {
  private readonly store = inject(Store);

  readonly query = input.required<WorkTaskBoardQuery>();
  /** "2026-09". */
  readonly month = input.required<string>();
  readonly canMove = input(false);
  /** Every task on the page is the viewer's own: an avatar on each would say nothing. */
  readonly hideAssignee = input(false);
  readonly reloadToken = input(0);
  readonly monthChange = output<string>();
  readonly openTask = output<WorkTaskModel>();
  readonly showOverdue = output<void>();

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly isPhone = inject(LayoutService).isPhone;
  /** Days expanded beyond the space available in a calendar cell. */
  readonly expanded = signal<ReadonlySet<string>>(new Set());

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);

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
    // Overdue first, done last: when a day is too full, "+N more" hides what is already closed.
    const weight = (task: WorkTaskModel) => (isOverdueTask(task) ? 0 : task.status.id === WorkTaskStatus.Done ? 2 : 1);
    for (const [key, tasks] of days) days.set(key, [...tasks].sort((a, b) => weight(a) - weight(b)));
    return days;
  });

  /** Days of the month that have work, for the phone's agenda. */
  readonly agenda = computed(() =>
    this.weeks()
      .flat()
      .filter((day) => day.inMonth && (this.byDay().get(day.key)?.length ?? 0) > 0),
  );

  constructor() {
    effect(() => {
      const key = this.key();
      const query = this.monthQuery();
      this.reloadToken();
      untracked(() => {
        this.store.dispatch(TaskBoardStoreActions.keepPages({ keys: [key] }));
        this.store.dispatch(TaskBoardStoreActions.loadAll({ key, query, order: deadlineOrder }));
      });
    });
  }

  expand(day: Day): void {
    this.expanded.update((days) => new Set([...days, day.key]));
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
