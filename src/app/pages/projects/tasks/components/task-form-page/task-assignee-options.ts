import { WorkProjectParticipantModel } from '../../../../../core/models/work-projects';

export function eligibleTaskAssignees(
  participants: WorkProjectParticipantModel[],
): WorkProjectParticipantModel[] {
  return participants.filter((participant) => participant.category === 'staff');
}
