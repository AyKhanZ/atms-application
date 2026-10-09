import { ParamMap } from '@angular/router';
import { DashboardPeriod, DashboardQuery } from '../models/dashboard';

export interface DashboardPeriodOption {
  value: DashboardPeriod;
  label: string;
}

export const DASHBOARD_PERIOD_OPTIONS: DashboardPeriodOption[] = [
  { value: 'today', label: 'common.today' },
  { value: '7d', label: 'dashboard.periodOption.last7' },
  { value: '30d', label: 'dashboard.periodOption.last30' },
  { value: 'thisMonth', label: 'dashboard.periodOption.thisMonth' },
  { value: '6m', label: 'dashboard.periodOption.last6' },
  { value: '12m', label: 'dashboard.periodOption.last12' },
  { value: 'custom', label: 'dashboard.periodOption.custom' },
];

export const DEFAULT_DASHBOARD_QUERY: DashboardQuery = {
  projectId: null,
  period: '30d',
  from: null,
  to: null,
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

// unknown -> last 30 days
export function dashboardQueryFromParams(params: ParamMap): DashboardQuery {
  const projectId = params.get('projectId') || null;
  const period = params.get('period');
  const from = params.get('from');
  const to = params.get('to');

  if (period === 'custom' && from && to && isoDate.test(from) && isoDate.test(to)) {
    return { projectId, period, from, to };
  }

  const known = DASHBOARD_PERIOD_OPTIONS.some(
    (option) => option.value === period && option.value !== 'custom',
  );
  return { projectId, period: known ? (period as DashboardPeriod) : '30d', from: null, to: null };
}

export function dashboardQueryParams(query: DashboardQuery): Record<string, string | null> {
  return {
    projectId: query.projectId ?? '',
    period: query.period,
    from: query.period === 'custom' ? query.from : null,
    to: query.period === 'custom' ? query.to : null,
  };
}

export function sameDashboardQuery(left: DashboardQuery, right: DashboardQuery): boolean {
  return (
    left.projectId === right.projectId &&
    left.period === right.period &&
    left.from === right.from &&
    left.to === right.to
  );
}

// local date, same as the date pickers show
export function toIsoDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDate(value: string | null): Date | null {
  if (!value || !isoDate.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
