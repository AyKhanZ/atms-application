import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { formatDate } from '@angular/common';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Store } from '@ngrx/store';
import { WorkTaskBoardQuery, calendarDayOrder } from '../../../../core/models/work-task-board';
import { workTaskBoardMaxPageSize } from '../../../../core/services/work-task-board.service';
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
import { TranslocoDirective } from '@jsverse/transloco';
import { Popover, PopoverModule } from 'primeng/popover';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { ScrollSentinelDirective } from '../../../../shared/directives/scroll-sentinel.directive';
import { LoadMoreButtonComponent } from '../../../../shared/components/load-more-button/load-more-button.component';

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
    LoadMoreButtonComponent,
    PopoverModule,
    ScrollSentinelDirective,
    TaskCalendarChipComponent,
    TranslocoDirective,
  ],
  templateUrl: './task-calendar-view.component.html',
  styleUrl: './task-calendar-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskCalendarViewComponent {
  private readonly store = inject(Store);
  private readonly injector = inject(Injector);

  readonly query = input.required<WorkTaskBoardQuery>();
  // "2026-09"
  readonly month = input.required<string>();
  readonly canMove = input(false);
  // every task on the page is the viewers own, an avatar on each says nothing
  readonly hideAssignee = input(false);
  readonly reloadToken = input(0);
  readonly monthChange = output<string>();
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
  // the rest of a busy day opens over the grid, so the week row keeps its height;
  // the day outlives the panel: moving to another day hides it and shows it again
  readonly moreDay = signal<Day | null>(null);
  readonly moreOpen = signal(false);
  private readonly morePanel = viewChild<Popover>('morePanel');

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
  // undefined until the first request; the month holds only the first few cards of each day
  readonly page = computed<TaskBoardPageState | undefined>(() => this.pages()[this.key()]);

  // how many tasks each local day has; tasks set from another time zone can give one day two deadlines
  readonly dayTotals = computed(() => {
    const totals = new Map<string, number>();
    for (const [deadline, total] of Object.entries(this.page()?.totals ?? {})) {
      const key = dayKey(new Date(Number(deadline)));
      totals.set(key, (totals.get(key) ?? 0) + total);
    }
    return totals;
  });

  // the open "+ N more": that day's own list, read 50 at a time
  private readonly moreQuery = computed<WorkTaskBoardQuery | null>(() => {
    const day = this.moreDay();
    if (!day) return null;
    const next = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate() + 1);
    return { ...this.query(), deadlineFrom: day.date.toISOString(), deadlineTo: next.toISOString() };
  });
  private readonly moreKey = computed(() => {
    const query = this.moreQuery();
    return query ? `calendar-day|${filterKey(query)}` : null;
  });
  readonly morePage = computed<TaskBoardPageState | undefined>(() => {
    const key = this.moreKey();
    return key ? this.pages()[key] : undefined;
  });

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
      .filter((day) => day.inMonth && (this.dayTotals().get(day.key) ?? 0) > 0),
  );

  constructor() {
    effect(() => {
      const key = this.key();
      const query = this.monthQuery();
      this.reloadToken();
      untracked(() => {
        // the day list is dropped with the rest, its panel goes too
        this.morePanel()?.hide();
        this.store.dispatch(TaskBoardStoreActions.keepPages({ keys: [key] }));
        this.store.dispatch(TaskBoardStoreActions.loadCalendar({ key, query }));
      });
    });
  }

  // one panel for the whole grid: the same "+N more" closes it, another one moves it there.
  // primeng 21 toggle onto a new target hides and never shows again, so an open panel is moved instead
  toggleMore(day: Day, event: Event): void {
    const panel = this.morePanel();
    if (!panel) return;
    const closing = panel.overlayVisible && this.moreDay()?.key === day.key;
    const moving = panel.overlayVisible && !closing;
    this.moreDay.set(day);
    if (!closing) this.loadMore(null);
    if (!moving) {
      panel.toggle(event);
      return;
    }
    panel.target = event.currentTarget;
    afterNextRender(() => panel.align(), { injector: this.injector });
  }

  loadMore(cursor: string | null): void {
    const key = this.moreKey();
    const query = this.moreQuery();
    if (!key || !query) return;
    this.store.dispatch(
      TaskBoardStoreActions.loadPage({
        key,
        query,
        order: calendarDayOrder,
        pageSize: workTaskBoardMaxPageSize,
        cursor,
      }),
    );
  }

  step(months: number): void {
    const first = this.firstDay();
    const next = new Date(first.getFullYear(), first.getMonth() + months, 1);
    this.morePanel()?.hide();
    this.monthChange.emit(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  }

  today(): void {
    const now = new Date();
    this.morePanel()?.hide();
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
