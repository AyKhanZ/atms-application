import { HistoryPersonModel } from '../history';

export interface DashboardWorkloadSegmentModel {
  kind: 'user' | 'others' | 'unassigned';
  person: HistoryPersonModel | null;
  value: number;
}

export interface DashboardWorkloadModel {
  segments: DashboardWorkloadSegmentModel[];
}
