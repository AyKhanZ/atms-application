import {
  createDefaultWorkProjectListFilter,
  WorkProjectItemModel,
  WorkProjectListFilter,
  WorkProjectModel,
} from '../../core/models/work-projects';

export interface WorkProjectsState {
  items: WorkProjectItemModel[];
  item: WorkProjectModel | null;
  totalCount: number;
  filter: WorkProjectListFilter;
  isLoading: boolean;
  isSubmitted: boolean;
}

export const initialWorkProjectsState: WorkProjectsState = {
  items: [],
  item: null,
  totalCount: 0,
  filter: createDefaultWorkProjectListFilter(),
  isLoading: false,
  isSubmitted: false,
};
