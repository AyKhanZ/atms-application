import { DOCUMENT, formatDate } from '@angular/common';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { angularLocale, currentLanguage } from '../../core/i18n/active-language';
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
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
  DashboardGranularity,
  DashboardKpiModel,
  DashboardPeriod,
  DashboardQuery,
} from '../../core/models/dashboard';
import { WorkItemRefModel } from '../../core/models/work-items';
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
import { workItemRoute } from '../../core/utils/work-item-route.utils';
import { DashboardStoreActions, DashboardStoreSelectors } from '../../store/dashboard';
import { DashboardActivityComponent } from './components/dashboard-activity.component';
import {
  DashboardChartComponent,
  DashboardChartSeries,
} from './components/dashboard-chart.component';
import { DashboardDeadlinesComponent } from './components/dashboard-deadlines.component';
import { DashboardToolbarComponent } from './components/dashboard-toolbar.component';

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
  open: { label: 'dashboard.kpi.open', icon: 'pi-inbox', tone: '--orange' },
  inProgress: { label: 'dashboard.series.inProgress', icon: 'pi-sync', tone: '--status-dot-progress' },
  overdue: { label: 'common.overdue', icon: 'pi-exclamation-circle', tone: '--app-danger' },
  unassigned: { label: 'common.unassigned', icon: 'pi-user-minus', tone: '--app-muted' },
  created: { label: 'dashboard.kpi.created', icon: 'pi-plus-circle', tone: '--status-dot-new' },
  done: { label: 'dashboard.series.done', icon: 'pi-check-circle', tone: '--status-dot-done' },
};

const kpiHints: Record<Exclude<DashboardKpiModel['key'], 'created' | 'done'>, string> = {
  open: 'dashboard.kpi.openHint',
  inProgress: 'dashboard.kpi.inProgressHint',
  overdue: 'dashboard.kpi.overdueHint',
  unassigned: 'dashboard.kpi.unassignedHint',
};

@Component({
  selector: 'app-dashboard',
  imports: [
    DashboardActivityComponent,
    DashboardChartComponent,
    DashboardDeadlinesComponent,
    DashboardToolbarComponent,
    TranslocoDirective,
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
  private readonly transloco = inject(TranslocoService);
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private ageTimer: ReturnType<typeof setInterval> | null = null;
  private entered = false;

  readonly periodOptions = computed(() => {
    currentLanguage();
    return DASHBOARD_PERIOD_OPTIONS.map((option) => ({
      ...option,
      label: this.transloco.translate(option.label),
    }));
  });
  readonly today = startOfToday();
  readonly model = this.store.selectSignal(DashboardStoreSelectors.getModel);
  readonly loading = this.store.selectSignal(DashboardStoreSelectors.getLoading);
  readonly error = this.store.selectSignal(DashboardStoreSelectors.getError);
  readonly projects = this.store.selectSignal(DashboardStoreSelectors.getProjectOptions);
  readonly selectedProject = this.store.selectSignal(DashboardStoreSelectors.getSelectedProject);
  readonly priorities = this.store.selectSignal(DashboardStoreSelectors.getPriorities);
  readonly now = signal(Date.now());

  // nothing loads until Apply
  readonly editingCustom = signal(false);
  readonly customFrom = signal<Date | null>(null);
  readonly customTo = signal<Date | null>(null);

  readonly query = computed<DashboardQuery>(() => dashboardQueryFromParams(this.params()));
  readonly selectedPeriod = computed<DashboardPeriod>(() =>
    this.editingCustom() ? 'custom' : this.query().period,
  );
  // calendars refuse what the server refuses: nothing after today, end after start, max a year
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
    currentLanguage();
    const from = this.customFrom();
    const to = this.customTo();
    const text = (key: string) => this.transloco.translate(key);
    if (!from || !to) return text('dashboard.range.both');
    if (from > to) return text('dashboard.range.order');
    if (to > this.today) return text('dashboard.range.untilToday');
    if (Math.round((to.getTime() - from.getTime()) / dayMs) + 1 > maxRangeDays) {
      return text('dashboard.range.year');
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
    currentLanguage();
    return [
      { id: '', label: this.transloco.translate('dashboard.allProjects') },
      ...entries.map((item) => ({ id: item.id, label: `#${item.code} ${item.title}` })),
    ];
  });

  readonly periodText = computed(() => {
    currentLanguage();
    const data = this.model();
    if (!data) return '';
    if (data.period === 'custom') return rangeText(data.from, data.to);
    const key = DASHBOARD_PERIOD_OPTIONS.find((option) => option.value === data.period)?.label;
    return key ? this.transloco.translate(key) : '';
  });
  // only the dates, project and period name are already in the fields next to it
  readonly scopeText = computed(() => {
    const data = this.model();
    return data && data.period !== 'custom' ? rangeText(data.from, data.to) : '';
  });
  readonly updatedText = computed(() => {
    const generatedAt = this.model()?.generatedAt;
    if (!generatedAt) return '';
    currentLanguage();
    const minutes = Math.max(0, Math.floor((this.now() - Date.parse(generatedAt)) / 60_000));
    return minutes === 0
      ? this.transloco.translate('dashboard.updatedNow')
      : this.transloco.translate('dashboard.updatedAgo', { count: minutes });
  });

  readonly kpiCards = computed<KpiCard[]>(() => {
    currentLanguage();
    const kpis = this.model()?.kpis ?? [];
    const period = this.periodText();
    return (['open', 'inProgress', 'overdue', 'unassigned', 'created', 'done'] as const)
      .map((key) => kpis.find((kpi) => kpi.key === key))
      .filter((kpi) => kpi !== undefined)
      .map((kpi) => ({
        key: kpi.key,
        ...kpiLooks[kpi.key],
        label: this.transloco.translate(kpiLooks[kpi.key].label),
        hint:
          kpi.key === 'created' || kpi.key === 'done'
            ? period
            : this.transloco.translate(kpiHints[kpi.key]),
        value: kpi.value,
        alert: kpi.key === 'overdue' && kpi.value > 0,
        delta: kpi.changePercent ?? null,
        // task list has no created-date filter, so Created leads nowhere
        clickable: kpi.key !== 'created',
      }));
  });

  readonly granularityText = computed(() => {
    currentLanguage();
    const granularity = this.model()?.granularity;
    return granularity ? this.transloco.translate(`dashboard.granularity.${granularity}`) : '';
  });
  readonly mainLabels = computed(() => {
    const data = this.model();
    return data ? data.mainChart.labels.map((label) => bucketLabel(label, data.granularity)) : [];
  });
  readonly mainTooltipLabels = computed(() => {
    const data = this.model();
    return data ? data.mainChart.labels.map((label) => bucketTooltip(label, data.granularity)) : [];
  });
  readonly mainSeries = computed<DashboardChartSeries[]>(() => {
    const series = this.model()?.mainChart.series ?? [];
    const values = (key: 'created' | 'started' | 'done') =>
      series.find((item) => item.key === key)?.data ?? [];
    currentLanguage();
    return [
      // same colors as status dots
      { label: this.transloco.translate('dashboard.series.new'), values: values('created'), color: '--status-dot-new' },
      {
        label: this.transloco.translate('dashboard.series.inProgress'),
        values: values('started'),
        color: '--status-dot-progress',
      },
      { label: this.transloco.translate('dashboard.series.done'), values: values('done'), color: '--status-dot-done' },
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
  readonly statusSeries = computed<DashboardChartSeries[]>(() => {
    currentLanguage();
    return [
    {
      label: this.transloco.translate('dashboard.chart.tasks'),
      values: this.statusChart()?.segments.map((item) => item.value) ?? [],
      color: '--orange',
    },
  ];
  });
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
  readonly prioritySeries = computed<DashboardChartSeries[]>(() => {
    currentLanguage();
    return [
    {
      label: this.transloco.translate('dashboard.tasksNotDone'),
      values: this.priorityChart()?.segments.map((item) => item.value) ?? [],
      color: '--orange',
    },
  ];
  });
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
  readonly workloadLabels = computed(() => {
    currentLanguage();
    return this.workloadSegments().map((item) =>
      item.kind === 'user'
        ? personShortName(item.person)
        : item.kind === 'others'
          ? this.transloco.translate('dashboard.others')
          : this.transloco.translate('common.unassigned'),
    );
  });
  readonly workloadTooltips = computed(() => {
    currentLanguage();
    return this.workloadSegments().map((item, index) =>
      item.kind === 'others' ? this.transloco.translate('dashboard.otherPeople') : this.workloadLabels()[index],
    );
  });
  readonly workloadSeries = computed<DashboardChartSeries[]>(() => {
    currentLanguage();
    return [
    {
      label: this.transloco.translate('dashboard.tasksNotDone'),
      values: this.workloadSegments().map((item) => item.value),
      color: '--orange',
    },
  ];
  });
  readonly workloadDisabledIndices = computed(() =>
    this.workloadSegments().flatMap((item, index) => (item.kind === 'others' ? [index] : [])),
  );
  readonly workloadColors = computed(() =>
    this.workloadSegments().map((item) => (item.kind === 'user' ? '--orange' : '--app-muted')),
  );

  readonly secondaryLabels = computed(
    () => this.model()?.secondaryChart.segments.map((item) => `#${item.code} ${item.label}`) ?? [],
  );
  readonly secondarySeries = computed<DashboardChartSeries[]>(() => {
    currentLanguage();
    return [
    {
      label: this.transloco.translate('dashboard.tasksNotDone'),
      values: this.model()?.secondaryChart.segments.map((item) => item.value) ?? [],
      color: '--orange',
    },
  ];
  });
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
      // link or reload with a custom range fills the fields
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

  // new start out of range clears the end
  setCustomFrom(from: Date | null): void {
    this.customFrom.set(from);
    const to = this.customTo();
    if (from && to && (to < from || to > addDays(from, maxRangeDays - 1))) this.customTo.set(null);
  }

  setCustomTo(to: Date | null): void {
    this.customTo.set(to);
    const from = this.customFrom();
    if (to && from && (from > to || from < addDays(to, 1 - maxRangeDays)))
      this.customFrom.set(null);
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

  showAllDeadlines(): void {
    const today = startOfToday();
    this.openTasks({
      state: '1,2',
      sort: String(WorkTaskBoardSort.Deadline),
      deadlineFrom: today.toISOString(),
      deadlineTo: addDays(today, 7).toISOString(),
    });
  }

  openRef(ref: WorkItemRefModel): void {
    void this.router.navigate(workItemRoute(ref));
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

// angular formatter like history and attachments, Intl writes "Sept" in en-GB
const date = (value: Date, format: string) => formatDate(value, format, angularLocale());

function rangeText(from: string, to: string): string {
  const start = fromIsoDate(from);
  const end = fromIsoDate(to);
  if (!start || !end) return '';
  if (from === to) return date(start, 'd MMM');
  const format = start.getFullYear() !== end.getFullYear() ? 'd MMM y' : 'd MMM';
  return `${date(start, format)} – ${date(end, format)}`;
}

// api sends yyyy-MM-ddTHH:mm, yyyy-MM-dd or yyyy-MM
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

// calendar days, not 24h, so a DST day stays one day
function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
