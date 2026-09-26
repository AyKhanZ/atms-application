export interface DashboardKpiModel {
  key: 'open' | 'inProgress' | 'overdue' | 'unassigned' | 'created' | 'done';
  value: number;
  previousValue?: number;
  changePercent?: number | null;
}
