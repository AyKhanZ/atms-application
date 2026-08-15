import { WorkProjectParticipantCommand } from './work-project-participant.command';

export interface WorkProjectCommand {
  title: string;
  description?: string | null;
  organizationId?: string | null;
  projectTypeId: number;
  projectKindId: number;
  projectStatusId: number;
  startDate?: string | null;
  endDate?: string | null;
  participants: WorkProjectParticipantCommand[];
}
