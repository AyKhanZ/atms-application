import { DashboardActivityModel } from './dashboard-activity.model';
import {
  DashboardSeriesChartModel,
  DashboardDonutChartModel,
  DashboardSecondaryChartModel,
} from './dashboard-chart.model';
import { DashboardDeadlineModel } from './dashboard-deadline.model';
import { DashboardKpiModel } from './dashboard-kpi.model';
import { DashboardWorkloadModel } from './dashboard-workload.model';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'thisMonth' | '6m' | '12m' | 'custom';
export type DashboardGranularity = 'hour' | 'day' | 'month';

export interface DashboardModel {
  generatedAt: string;
  period: DashboardPeriod;
  from: string;
  to: string;
  granularity: DashboardGranularity;
  kpis: DashboardKpiModel[];
  mainChart: DashboardSeriesChartModel;
  donuts: DashboardDonutChartModel[];
  workload: DashboardWorkloadModel | null;
  secondaryChart: DashboardSecondaryChartModel;
  deadlines: DashboardDeadlineModel[];
  // all open tasks due in 7 days, deadlines has only the nearest
  deadlineCount: number;
  activities: DashboardActivityModel[];
}

export interface DashboardQuery {
  projectId: string | null;
  period: DashboardPeriod;
  // yyyy-MM-dd, only for custom period
  from: string | null;
  to: string | null;
}
