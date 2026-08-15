import { DictionaryModel } from '../dictionary.model';
import { WorkProjectOrganizationModel } from './work-project-organization.model';

export interface WorkProjectItemModel {
  id: string;
  code: string;
  title: string;
  organization?: WorkProjectOrganizationModel | null;
  projectType: DictionaryModel;
  projectKind: DictionaryModel;
  projectStatus: DictionaryModel;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}
