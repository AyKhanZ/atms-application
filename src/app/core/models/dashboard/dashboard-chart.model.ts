export interface DashboardSeriesModel {
  key: 'created' | 'started' | 'done';
  data: number[];
}

export interface DashboardSeriesChartModel {
  labels: string[];
  series: DashboardSeriesModel[];
}

export interface DashboardDictionarySegmentModel {
  id: number;
  label: string;
  value: number;
}

export interface DashboardDonutChartModel {
  key: 'byStatus' | 'byPriority';
  segments: DashboardDictionarySegmentModel[];
}

export interface DashboardEntitySegmentModel {
  id: string;
  code: string;
  label: string;
  value: number;
}

export interface DashboardSecondaryChartModel {
  key: 'byProject' | 'byTicket';
  segments: DashboardEntitySegmentModel[];
}
