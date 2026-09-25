import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Actions, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { SelectModule } from 'primeng/select';
import { DashboardRefModel, DashboardQuery } from '../../core/models/dashboard';
import { WorkTaskStatus } from '../../core/enums/work-task-status.enum';
import { workItemPriorityTone } from '../../shared/components/work-item-priority/work-item-priority.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { personShortName } from '../../core/utils/person-name.utils';
import { VisiblePageRefreshService } from '../../core/services/visible-page-refresh.service';
import { DashboardStoreActions, DashboardStoreSelectors } from '../../store/dashboard';
import { DashboardActivityComponent } from './components/dashboard-activity.component';
import { DashboardChartComponent } from './components/dashboard-chart.component';
import { DashboardDeadlinesComponent } from './components/dashboard-deadlines.component';

const refreshSafetyMs = 300_000;

@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule,
    SelectModule,
    EmptyStateComponent,
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

  readonly model = this.store.selectSignal(DashboardStoreSelectors.getModel);
  readonly loading = this.store.selectSignal(DashboardStoreSelectors.getLoading);
  readonly error = this.store.selectSignal(DashboardStoreSelectors.getError);
  readonly projects = this.store.selectSignal(DashboardStoreSelectors.getProjectOptions);
  readonly selectedProject = this.store.selectSignal(DashboardStoreSelectors.getSelectedProject);
  readonly priorities = this.store.selectSignal(DashboardStoreSelectors.getPriorities);
  readonly now = signal(Date.now());

  readonly query = computed<DashboardQuery>(() => {
    const period = Number(this.params().get('period'));
    return {
      projectId: this.params().get('projectId') || null,
      period: period === 7 || period === 90 ? period : 30,
    };
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
  readonly updatedMinutes = computed(() => {
    const generatedAt = this.model()?.generatedAt;
    return generatedAt
      ? Math.max(0, Math.floor((this.now() - Date.parse(generatedAt)) / 60_000))
      : 0;
  });
  readonly kpis = computed(() => {
    const list = this.model()?.kpis ?? [];
    return (['open', 'inProgress', 'overdue', 'done'] as const)
      .map((key) => list.find((item) => item.key === key))
      .filter((item) => item !== undefined);
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
  readonly statusValues = computed(
    () => this.statusChart()?.segments.map((item) => item.value) ?? [],
  );
  readonly priorityLabels = computed(
    () => this.priorityChart()?.segments.map((item) => item.label) ?? [],
  );
  readonly priorityValues = computed(
    () => this.priorityChart()?.segments.map((item) => item.value) ?? [],
  );
  readonly createdSeries = computed(
    () => this.model()?.mainChart.series.find((item) => item.key === 'created')?.data ?? [],
  );
  readonly doneSeries = computed(
    () => this.model()?.mainChart.series.find((item) => item.key === 'done')?.data ?? [],
  );
  readonly mainHasData = computed(() =>
    [...this.createdSeries(), ...this.doneSeries()].some((value) => value > 0),
  );
  readonly statusHasData = computed(() => this.statusValues().some((value) => value > 0));
  readonly priorityHasData = computed(() => this.priorityValues().some((value) => value > 0));
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
  readonly workloadValues = computed(() => this.workloadSegments().map((item) => item.value));
  readonly workloadDisabledIndices = computed(() =>
    this.workloadSegments().flatMap((item, index) => (item.kind === 'others' ? [index] : [])),
  );
  readonly workloadColors = computed(() =>
    this.workloadSegments().map((item) => (item.kind === 'user' ? '--orange' : '--app-muted')),
  );
  readonly secondaryColors = computed(
    () => this.model()?.secondaryChart.segments.map(() => '--orange') ?? [],
  );
  readonly secondaryLabels = computed(
    () => this.model()?.secondaryChart.segments.map((item) => `#${item.code} ${item.label}`) ?? [],
  );
  readonly secondaryValues = computed(
    () => this.model()?.secondaryChart.segments.map((item) => item.value) ?? [],
  );

  constructor() {
    effect(() => {
      const query = this.query();
      if (
        !this.params().has('projectId') ||
        !this.params().has('period') ||
        ![7, 30, 90].includes(Number(this.params().get('period')))
      ) {
        this.navigate(query);
        return;
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
    this.navigate({ ...this.query(), projectId: projectId || null });
  }

  changePeriod(period: 7 | 30 | 90): void {
    this.navigate({ ...this.query(), period });
  }

  searchProjects(event: { filter?: string }): void {
    this.store.dispatch(DashboardStoreActions.searchProjects({ search: event.filter ?? '' }));
  }

  retry(): void {
    this.store.dispatch(DashboardStoreActions.refresh());
  }

  openKpi(key: string): void {
    if (key === 'overdue') this.openTasks({ deadline: 'overdue' });
    else if (key === 'done') this.openTasks({ state: String(WorkTaskStatus.Done), view: 'board' });
    else
      this.openTasks({ state: key === 'inProgress' ? String(WorkTaskStatus.InProgress) : '1,2' });
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

  openRef(ref: DashboardRefModel): void {
    const route = ['/projects', ref.projectId];
    if (ref.workTicketId) route.push('tickets', ref.workTicketId);
    if (ref.workTaskId) route.push('tasks', ref.workTaskId);
    void this.router.navigate(route);
  }

  private navigate(query: DashboardQuery): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { projectId: query.projectId ?? '', period: query.period },
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
