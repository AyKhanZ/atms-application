import { PersonModel } from '../person.model';

export interface DashboardWorkloadSegmentModel {
  kind: 'user' | 'others' | 'unassigned';
  person: PersonModel | null;
  value: number;
}

export interface DashboardWorkloadModel {
  segments: DashboardWorkloadSegmentModel[];
}
