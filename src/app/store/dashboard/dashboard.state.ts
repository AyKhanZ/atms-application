import { DictionaryModel } from '../../core/models/dictionary.model';
import { DEFAULT_DASHBOARD_QUERY } from '../../core/utils/dashboard-query.utils';
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
  query: DEFAULT_DASHBOARD_QUERY,
  model: null,
  loading: false,
  error: null,
  projectOptions: [],
  selectedProject: null,
  groupProjectIds: [],
  priorities: [],
};
