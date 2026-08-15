import { WorkProjectOrganizationModel } from './work-project-organization.model';
import { WorkProjectParticipantModel } from './work-project-participant.model';
import { DictionaryModel } from '../dictionary.model';

export interface WorkProjectModel {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  organization?: WorkProjectOrganizationModel | null;
  projectType: DictionaryModel;
  projectKind: DictionaryModel;
  projectStatus: DictionaryModel;
  startDate?: string | null;
  endDate?: string | null;
  participants: WorkProjectParticipantModel[];
  createdAt: string;
}
