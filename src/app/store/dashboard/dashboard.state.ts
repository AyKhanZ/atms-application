import { DictionaryModel } from '../../core/models/dictionary.model';
import {
  DashboardModel,
  DashboardProjectOptionModel,
  DashboardQuery,
} from '../../core/models/dashboard';

export interface DashboardState {
  active: boolean;
  query: DashboardQuery;
  model: DashboardModel | null;
  loading: boolean;
  error: string | null;
  projectOptions: DashboardProjectOptionModel[];
  selectedProject: DashboardProjectOptionModel | null;
  groupProjectIds: string[];
  priorities: DictionaryModel[];
}

export const initialDashboardState: DashboardState = {
  active: false,
  query: { projectId: null, period: 30 },
  model: null,
  loading: false,
  error: null,
  projectOptions: [],
  selectedProject: null,
  groupProjectIds: [],
  priorities: [],
};
