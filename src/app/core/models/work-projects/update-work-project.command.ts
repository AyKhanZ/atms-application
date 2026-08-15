import { WorkProjectCommand } from './work-project.command';

export interface UpdateWorkProjectCommand extends WorkProjectCommand {
  id: string;
}
