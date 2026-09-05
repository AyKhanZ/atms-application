import { WorkProjectParticipantModel } from '../../../../../core/models/work-projects';
import { eligibleTaskAssignees } from './task-assignee-options';

describe('eligibleTaskAssignees', () => {
  it('returns only staff participants without depending on display role names', () => {
    const participants = [
      participant('Разработчик', 'staff'),
      participant('Biznes məsləhətçisi', 'staff'),
      participant('Project Manager', 'staff'),
      participant('Employee-looking role', 'client'),
      participant('Developer', 'admin'),
    ];

    const result = eligibleTaskAssignees(participants);

    expect(result.map((item) => item.category)).toEqual(['staff', 'staff', 'staff']);
  });
});

function participant(
  roleName: string,
  category: WorkProjectParticipantModel['category'],
): WorkProjectParticipantModel {
  return {
    id: crypto.randomUUID(),
    userId: crypto.randomUUID(),
    name: 'Test',
    surname: 'User',
    email: 'test@example.com',
    category,
    role: {
      id: crypto.randomUUID(),
      name: roleName,
      code: roleName,
    },
  };
}
