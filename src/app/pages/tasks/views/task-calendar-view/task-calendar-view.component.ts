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
import { formatDate } from '@angular/common';
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
import { angularLocale } from '../../../../core/i18n/active-language';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';

interface Day {
  // "2026-09-21", local date
  key: string;
  date: Date;
  inMonth: boolean;
  today: boolean;
  weekend: boolean;
}

const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// moving a card to another day moves the deadline; months are paged, exactly one is loaded
@Component({
  selector: 'app-task-calendar-view',
  imports: [
    AppDatePipe,
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
  // "2026-09"
  readonly month = input.required<string>();
  readonly canMove = input(false);
  // every task on the page is the viewers own, an avatar on each says nothing
  readonly hideAssignee = input(false);
  readonly reloadToken = input(0);
  readonly monthChange = output<string>();
  readonly openTask = output<WorkTaskModel>();
  readonly showOverdue = output<void>();

  readonly weekdays = computed(() => {
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return formatDate(date, 'EEE', angularLocale());
    });
  });
  readonly isPhone = inject(LayoutService).isPhone;
  readonly expanded = signal<ReadonlySet<string>>(new Set());

  private readonly pages = this.store.selectSignal(TaskBoardStoreSelectors.getPages);

  private readonly firstDay = computed(() => {
    const [year, month] = this.month().split('-').map(Number);
    return new Date(year, month - 1, 1);
  });

  // ru and az give the month in lower case ("октябрь"), a header starts with a capital
  readonly monthName = computed(() => {
    const name = formatDate(this.firstDay(), 'LLLL', angularLocale());
    return name.charAt(0).toLocaleUpperCase(angularLocale()) + name.slice(1);
  });
  readonly year = computed(() => this.firstDay().getFullYear());

  // local midnight sent as utc, same as the form stores
  private readonly monthQuery = computed<WorkTaskBoardQuery>(() => {
    const first = this.firstDay();
    const next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
    return { ...this.query(), deadlineFrom: first.toISOString(), deadlineTo: next.toISOString() };
  });

  private readonly key = computed(() => `calendar|${filterKey(this.monthQuery())}`);
  // undefined until the first request
  readonly page = computed<TaskBoardPageState | undefined>(() => this.pages()[this.key()]);

  // monday on or before the 1st to sunday on or after the last day
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

  readonly byDay = computed(() => {
    const days = new Map<string, WorkTaskModel[]>();
    for (const task of this.page()?.items ?? []) {
      if (!task.deadline) continue;
      const key = dayKey(new Date(task.deadline));
      const day = days.get(key);
      if (day) day.push(task);
      else days.set(key, [task]);
    }
    // overdue first, done last, so "+N more" hides closed work
    const weight = (task: WorkTaskModel) =>
      isOverdueTask(task) ? 0 : task.status.id === WorkTaskStatus.Done ? 2 : 1;
    for (const tasks of days.values()) tasks.sort((a, b) => weight(a) - weight(b));
    return days;
  });

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

  // same local midnight the form uses
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
