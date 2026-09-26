import { DOCUMENT, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import {
  DashboardGranularity,
  DashboardKpiModel,
  DashboardPeriod,
  DashboardQuery,
  DashboardRefModel,
} from '../../core/models/dashboard';
import { WorkTaskStatus } from '../../core/enums/work-task-status.enum';
import { WorkTaskBoardSort } from '../../core/models/work-task-board';
import { workItemPriorityTone } from '../../shared/components/work-item-priority/work-item-priority.component';
import { personShortName } from '../../core/utils/person-name.utils';
import {
  DASHBOARD_PERIOD_OPTIONS,
  dashboardQueryFromParams,
  dashboardQueryParams,
  fromIsoDate,
  toIsoDate,
} from '../../core/utils/dashboard-query.utils';
import { VisiblePageRefreshService } from '../../core/services/visible-page-refresh.service';
import { DashboardStoreActions, DashboardStoreSelectors } from '../../store/dashboard';
import { DashboardActivityComponent } from './components/dashboard-activity.component';
import {
  DashboardChartComponent,
  DashboardChartSeries,
} from './components/dashboard-chart.component';
import { DashboardDeadlinesComponent } from './components/dashboard-deadlines.component';

const refreshSafetyMs = 300_000;
const maxRangeDays = 366;
const dayMs = 86_400_000;

interface KpiCard {
  key: DashboardKpiModel['key'];
  label: string;
  hint: string;
  value: number;
  icon: string;
  tone: string;
  alert: boolean;
  delta: number | null;
  clickable: boolean;
}

const kpiLooks: Record<DashboardKpiModel['key'], { label: string; icon: string; tone: string }> = {
  open: { label: 'Not done', icon: 'pi-inbox', tone: '--orange' },
  inProgress: { label: 'In progress', icon: 'pi-sync', tone: '--status-dot-progress' },
  overdue: { label: 'Overdue', icon: 'pi-exclamation-circle', tone: '--app-danger' },
  unassigned: { label: 'Unassigned', icon: 'pi-user-minus', tone: '--app-muted' },
  created: { label: 'New tasks', icon: 'pi-plus-circle', tone: '--status-dot-new' },
  done: { label: 'Done', icon: 'pi-check-circle', tone: '--status-dot-done' },
};

@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule,
    SelectModule,
    DatePickerModule,
    DashboardActivityComponent,
    DashboardChartComponent,
    DashboardDeadlinesComponent,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnDestroy {
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actions$ = inject(Actions);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private ageTimer: ReturnType<typeof setInterval> | null = null;
  private entered = false;

  readonly periodOptions = DASHBOARD_PERIOD_OPTIONS;
  readonly today = startOfToday();
  readonly model = this.store.selectSignal(DashboardStoreSelectors.getModel);
  readonly loading = this.store.selectSignal(DashboardStoreSelectors.getLoading);
  readonly error = this.store.selectSignal(DashboardStoreSelectors.getError);
  readonly projects = this.store.selectSignal(DashboardStoreSelectors.getProjectOptions);
  readonly selectedProject = this.store.selectSignal(DashboardStoreSelectors.getSelectedProject);
  readonly priorities = this.store.selectSignal(DashboardStoreSelectors.getPriorities);
  readonly now = signal(Date.now());

  /** Picking "Custom range" opens the date fields; nothing is loaded until Apply. */
  readonly editingCustom = signal(false);
  readonly customFrom = signal<Date | null>(null);
  readonly customTo = signal<Date | null>(null);

  readonly query = computed<DashboardQuery>(() => dashboardQueryFromParams(this.params()));
  readonly selectedPeriod = computed<DashboardPeriod>(() =>
    this.editingCustom() ? 'custom' : this.query().period,
  );
  // The calendars refuse what the server would refuse: nothing after today, no end before the start
  // and no range longer than a year — so a wrong range cannot even be picked.
  readonly fromMinDate = computed(() => {
    const to = this.customTo();
    return to ? addDays(to, 1 - maxRangeDays) : null;
  });
  readonly fromMaxDate = computed(() => this.customTo() ?? this.today);
  readonly toMinDate = computed(() => this.customFrom());
  readonly toMaxDate = computed(() => {
    const from = this.customFrom();
    const yearOn = from ? addDays(from, maxRangeDays - 1) : null;
    return yearOn && yearOn < this.today ? yearOn : this.today;
  });

  readonly customError = computed(() => {
    const from = this.customFrom();
    const to = this.customTo();
    if (!from || !to) return 'Pick both a start and an end date';
    if (from > to) return "The start date can't be after the end date";
    if (to > this.today) return 'Pick dates up to today';
    if (Math.round((to.getTime() - from.getTime()) / dayMs) + 1 > maxRangeDays) {
      return 'Pick a range of one year or less';
    }
    return null;
  });

  readonly projectOptions = computed(() => {
    const options = this.projects();
    const selected = this.selectedProject();
    const entries =
      selected && !options.some((item) => item.id === selected.id)
        ? [selected, ...options]
        : options;
    return [
      { id: '', label: 'All projects' },
      ...entries.map((item) => ({ id: item.id, label: `#${item.code} ${item.title}` })),
    ];
  });

  readonly periodText = computed(() => {
    const data = this.model();
    if (!data) return '';
    if (data.period === 'custom') return rangeText(data.from, data.to);
    return DASHBOARD_PERIOD_OPTIONS.find((option) => option.value === data.period)?.label ?? '';
  });
  /**
   * The dates behind the chosen period — the one thing the controls do not already show. The project
   * and the period name are in the fields right beside it; a custom range shows its dates itself.
   */
  readonly scopeText = computed(() => {
    const data = this.model();
    return data && data.period !== 'custom' ? rangeText(data.from, data.to) : '';
  });
  readonly updatedText = computed(() => {
    const generatedAt = this.model()?.generatedAt;
    if (!generatedAt) return '';
    const minutes = Math.max(0, Math.floor((this.now() - Date.parse(generatedAt)) / 60_000));
    return minutes === 0 ? 'Updated just now' : `Updated ${minutes} min ago`;
  });

  readonly kpiCards = computed<KpiCard[]>(() => {
    const kpis = this.model()?.kpis ?? [];
    const period = this.periodText();
    const hints: Record<DashboardKpiModel['key'], string> = {
      open: 'New and in progress',
      inProgress: 'Being worked on',
      overdue: 'Past the deadline',
      unassigned: 'Not done, nobody assigned',
      created: period,
      done: period,
    };
    return (['open', 'inProgress', 'overdue', 'unassigned', 'created', 'done'] as const)
      .map((key) => kpis.find((kpi) => kpi.key === key))
      .filter((kpi) => kpi !== undefined)
      .map((kpi) => ({
        key: kpi.key,
        ...kpiLooks[kpi.key],
        hint: hints[kpi.key],
        value: kpi.value,
        alert: kpi.key === 'overdue' && kpi.value > 0,
        delta: kpi.changePercent ?? null,
        // The task list has no filter by creation date, so Created has nowhere honest to lead.
        clickable: kpi.key !== 'created',
      }));
  });

  readonly granularityText = computed(() => {
    const granularity = this.model()?.granularity;
    return granularity ? `per ${granularity}` : '';
  });
  readonly mainLabels = computed(() => {
    const data = this.model();
    return data ? data.mainChart.labels.map((label) => bucketLabel(label, data.granularity)) : [];
  });
  readonly mainTooltipLabels = computed(() => {
    const data = this.model();
    return data
      ? data.mainChart.labels.map((label) => bucketTooltip(label, data.granularity))
      : [];
  });
  readonly mainSeries = computed<DashboardChartSeries[]>(() => {
    const series = this.model()?.mainChart.series ?? [];
    const values = (key: 'created' | 'started' | 'done') =>
      series.find((item) => item.key === key)?.data ?? [];
    return [
      // Named and coloured as the statuses the tasks moved into, the way every status dot is.
      { label: 'New', values: values('created'), color: '--status-dot-new' },
      { label: 'In progress', values: values('started'), color: '--status-dot-progress' },
      { label: 'Done', values: values('done'), color: '--status-dot-done' },
    ];
  });

  readonly statusChart = computed(() =>
    this.model()?.donuts.find((item) => item.key === 'byStatus'),
  );
  readonly priorityChart = computed(() =>
    this.model()?.donuts.find((item) => item.key === 'byPriority'),
  );
  readonly statusLabels = computed(
    () => this.statusChart()?.segments.map((item) => item.label) ?? [],
  );
  readonly statusSeries = computed<DashboardChartSeries[]>(() => [
    {
      label: 'Tasks',
      values: this.statusChart()?.segments.map((item) => item.value) ?? [],
      color: '--orange',
    },
  ]);
  readonly statusColors = computed(
    () =>
      this.statusChart()?.segments.map((item) =>
        item.id === WorkTaskStatus.New
          ? '--status-dot-new'
          : item.id === WorkTaskStatus.InProgress
            ? '--status-dot-progress'
            : '--status-dot-done',
      ) ?? [],
  );
  readonly priorityLabels = computed(
    () => this.priorityChart()?.segments.map((item) => item.label) ?? [],
  );
  readonly prioritySeries = computed<DashboardChartSeries[]>(() => [
    {
      label: 'Tasks not done',
      values: this.priorityChart()?.segments.map((item) => item.value) ?? [],
      color: '--orange',
    },
  ]);
  readonly priorityColors = computed(
    () =>
      this.priorityChart()?.segments.map((item) => {
        const code =
          this.priorities().find((priority) => priority.id === item.id)?.code ?? item.label;
        const tone = workItemPriorityTone(code);
        return tone === 'medium'
          ? '--priority-medium'
          : tone === 'high'
            ? '--orange-text-hover'
            : tone === 'critical'
              ? '--red-hover'
              : '--app-muted';
      }) ?? [],
  );

  readonly workloadSegments = computed(
    () => this.model()?.workload?.segments.filter((item) => item.value > 0) ?? [],
  );
  readonly workloadLabels = computed(() =>
    this.workloadSegments().map((item) =>
      item.kind === 'user'
        ? personShortName(item.person)
        : item.kind === 'others'
          ? 'Others'
          : 'Unassigned',
    ),
  );
  readonly workloadTooltips = computed(() =>
    this.workloadSegments().map((item, index) =>
      item.kind === 'others' ? 'Other people' : this.workloadLabels()[index],
    ),
  );
  readonly workloadSeries = computed<DashboardChartSeries[]>(() => [
    { label: 'Tasks not done', values: this.workloadSegments().map((item) => item.value), color: '--orange' },
  ]);
  readonly workloadDisabledIndices = computed(() =>
    this.workloadSegments().flatMap((item, index) => (item.kind === 'others' ? [index] : [])),
  );
  readonly workloadColors = computed(() =>
    this.workloadSegments().map((item) => (item.kind === 'user' ? '--orange' : '--app-muted')),
  );

  readonly secondaryLabels = computed(
    () => this.model()?.secondaryChart.segments.map((item) => `#${item.code} ${item.label}`) ?? [],
  );
  readonly secondarySeries = computed<DashboardChartSeries[]>(() => [
    {
      label: 'Tasks not done',
      values: this.model()?.secondaryChart.segments.map((item) => item.value) ?? [],
      color: '--orange',
    },
  ]);
  readonly secondaryColors = computed(
    () => this.model()?.secondaryChart.segments.map(() => '--orange') ?? [],
  );

  constructor() {
    effect(() => {
      const query = this.query();
      const params = this.params();
      const wanted = dashboardQueryParams(query);
      const normalized =
        params.has('projectId') &&
        Object.entries(wanted).every(([key, value]) => (params.get(key) ?? null) === value);
      if (!normalized) {
        this.navigate(query);
        return;
      }
      // A link or a reload with a custom range shows its dates in the fields.
      if (query.period === 'custom' && !untracked(this.editingCustom)) {
        this.customFrom.set(fromIsoDate(query.from));
        this.customTo.set(fromIsoDate(query.to));
      }
      if (!this.entered) {
        this.entered = true;
        this.store.dispatch(DashboardStoreActions.enter({ query }));
      } else {
        this.store.dispatch(DashboardStoreActions.load({ query }));
      }
      if (query.projectId)
        this.store.dispatch(DashboardStoreActions.loadSelectedProject({ id: query.projectId }));
    });

    inject(VisiblePageRefreshService)
      .onReturn('dashboard', 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.dispatch(DashboardStoreActions.refresh()));

    this.actions$
      .pipe(
        ofType(DashboardStoreActions.loadSuccess, DashboardStoreActions.loadFailure),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.resetSafetyTimer());

    this.ageTimer = setInterval(() => this.now.set(Date.now()), 60_000);
  }

  ngOnDestroy(): void {
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    if (this.ageTimer) clearInterval(this.ageTimer);
    this.store.dispatch(DashboardStoreActions.leave());
  }

  changeProject(projectId: string): void {
    const query = this.query();
    this.editingCustom.set(false);
    this.customFrom.set(fromIsoDate(query.from));
    this.customTo.set(fromIsoDate(query.to));
    this.navigate({ ...query, projectId: projectId || null });
  }

  changePeriod(period: DashboardPeriod): void {
    if (period === 'custom') {
      const query = this.query();
      const data = this.model();
      this.customFrom.set(fromIsoDate(query.from ?? data?.from ?? null));
      this.customTo.set(fromIsoDate(query.to ?? data?.to ?? null));
      this.editingCustom.set(true);
      return;
    }
    this.editingCustom.set(false);
    this.navigate({ ...this.query(), period, from: null, to: null });
  }

  /** A new start that leaves the end out of reach clears the end: it has to be picked again. */
  setCustomFrom(from: Date | null): void {
    this.customFrom.set(from);
    const to = this.customTo();
    if (from && to && (to < from || to > addDays(from, maxRangeDays - 1))) this.customTo.set(null);
  }

  setCustomTo(to: Date | null): void {
    this.customTo.set(to);
    const from = this.customFrom();
    if (to && from && (from > to || from < addDays(to, 1 - maxRangeDays))) this.customFrom.set(null);
  }

  applyCustom(): void {
    const from = this.customFrom();
    const to = this.customTo();
    if (this.customError() || !from || !to) return;
    this.editingCustom.set(false);
    this.navigate({ ...this.query(), period: 'custom', from: toIsoDate(from), to: toIsoDate(to) });
  }

  searchProjects(event: { filter?: string }): void {
    this.store.dispatch(DashboardStoreActions.searchProjects({ search: event.filter ?? '' }));
  }

  refresh(): void {
    this.store.dispatch(DashboardStoreActions.refresh());
  }

  openKpi(key: DashboardKpiModel['key']): void {
    switch (key) {
      case 'overdue':
        this.openTasks({ deadline: 'overdue' });
        break;
      case 'done':
        this.openTasks({ state: String(WorkTaskStatus.Done), view: 'board' });
        break;
      case 'unassigned':
        this.openTasks({ state: '1,2', assignee: 'none' });
        break;
      case 'inProgress':
        this.openTasks({ state: String(WorkTaskStatus.InProgress) });
        break;
      case 'open':
        this.openTasks({ state: '1,2' });
        break;
    }
  }

  openStatus(index: number): void {
    const segment = this.statusChart()?.segments[index];
    if (segment) this.openTasks({ state: String(segment.id) });
  }

  openPriority(index: number): void {
    const segment = this.priorityChart()?.segments[index];
    if (segment) this.openTasks({ state: '1,2', priority: String(segment.id) });
  }

  openWorkload(index: number): void {
    const segment = this.workloadSegments()[index];
    if (!segment || segment.kind === 'others') return;
    this.openTasks({
      state: '1,2',
      assignee: segment.kind === 'unassigned' ? 'none' : (segment.person?.id ?? ''),
    });
  }

  openSecondary(index: number): void {
    const chart = this.model()?.secondaryChart;
    const segment = chart?.segments[index];
    if (!segment) return;
    this.openTasks({
      state: '1,2',
      ...(chart.key === 'byProject' ? { project: segment.id } : { ticket: segment.id }),
    });
  }

  /** Every deadline, not only the nearest ten the card lists. */
  showAllDeadlines(): void {
    const today = startOfToday();
    this.openTasks({
      state: '1,2',
      sort: String(WorkTaskBoardSort.Deadline),
      deadlineFrom: today.toISOString(),
      deadlineTo: addDays(today, 7).toISOString(),
    });
  }

  openRef(ref: DashboardRefModel): void {
    const route = ['/projects', ref.projectId];
    if (ref.workTicketId) route.push('tickets', ref.workTicketId);
    if (ref.workTaskId) route.push('tasks', ref.workTaskId);
    void this.router.navigate(route);
  }

  private navigate(query: DashboardQuery): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: dashboardQueryParams(query),
      replaceUrl: true,
    });
  }

  private openTasks(patch: Record<string, string>): void {
    void this.router.navigate(['/tasks'], {
      queryParams: {
        view: 'list',
        assignee: '',
        project: this.query().projectId ?? null,
        ...patch,
      },
    });
  }

  private resetSafetyTimer(): void {
    if (this.safetyTimer) clearTimeout(this.safetyTimer);
    this.safetyTimer = setTimeout(() => {
      if (this.document.visibilityState === 'visible')
        this.store.dispatch(DashboardStoreActions.refresh());
    }, refreshSafetyMs);
  }
}

// Angular's formatter, as in History and Attachments: `Intl` writes September as "Sept" in en-GB.
const date = (value: Date, format: string) => formatDate(value, format, 'en-US');

function rangeText(from: string, to: string): string {
  const start = fromIsoDate(from);
  const end = fromIsoDate(to);
  if (!start || !end) return '';
  if (from === to) return date(start, 'd MMM');
  const format = start.getFullYear() !== end.getFullYear() ? 'd MMM y' : 'd MMM';
  return `${date(start, format)} – ${date(end, format)}`;
}

/** Axis label of a bucket the API names as yyyy-MM-ddTHH:mm, yyyy-MM-dd or yyyy-MM. */
function bucketLabel(label: string, granularity: DashboardGranularity): string {
  if (granularity === 'hour') return label.slice(11, 16);
  if (granularity === 'month') return date(monthDate(label), 'MMM y');
  return date(fromIsoDate(label) ?? new Date(label), 'd MMM');
}

function bucketTooltip(label: string, granularity: DashboardGranularity): string {
  if (granularity === 'hour') return `${label.slice(11, 16)} – ${label.slice(11, 13)}:59`;
  if (granularity === 'month') return date(monthDate(label), 'MMMM y');
  return date(fromIsoDate(label) ?? new Date(label), 'EEE, d MMM y');
}

function monthDate(label: string): Date {
  const [year, month] = label.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Calendar days, not 24-hour steps: a daylight-saving day stays one day. */
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
