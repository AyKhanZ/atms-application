export interface DashboardKpiModel {
  key: 'open' | 'inProgress' | 'overdue' | 'done';
  value: number;
  previousValue?: number;
  changePercent?: number | null;
}
