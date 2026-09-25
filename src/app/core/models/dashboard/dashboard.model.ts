import { DashboardActivityModel } from './dashboard-activity.model';
import {
  DashboardSeriesChartModel,
  DashboardDonutChartModel,
  DashboardSecondaryChartModel,
} from './dashboard-chart.model';
import { DashboardDeadlineModel } from './dashboard-deadline.model';
import { DashboardKpiModel } from './dashboard-kpi.model';
import { DashboardWorkloadModel } from './dashboard-workload.model';

export interface DashboardModel {
  generatedAt: string;
  period: 7 | 30 | 90;
  kpis: DashboardKpiModel[];
  mainChart: DashboardSeriesChartModel;
  donuts: DashboardDonutChartModel[];
  workload: DashboardWorkloadModel | null;
  secondaryChart: DashboardSecondaryChartModel;
  deadlines: DashboardDeadlineModel[];
  activities: DashboardActivityModel[];
}

export interface DashboardQuery {
  projectId: string | null;
  period: 7 | 30 | 90;
}
