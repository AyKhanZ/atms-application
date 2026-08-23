import { DictionaryModel } from '../dictionary.model';

export interface WorkGroupModel {
  id: string;
  title: string;
  parentWorkGroupId: string | null;
  status: DictionaryModel;
  ticketCount: number;
  milestones: WorkGroupModel[];
}
