import { WorkGroupModel } from '../../core/models/work-groups';

export interface WorkGroupsState {
  items: WorkGroupModel[];
  projectId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
}

export const initialWorkGroupsState: WorkGroupsState = {
  items: [],
  projectId: null,
  isLoading: false,
  isSaving: false,
  loadError: null,
};
