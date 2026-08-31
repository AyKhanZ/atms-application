import { MilestoneOptionModel } from '../../../../../core/models/work-groups';
import { toMilestoneOption } from './ticket-milestone-options';

describe('toMilestoneOption', () => {
  it('keeps the parent group context in the visible label', () => {
    const milestone: MilestoneOptionModel = {
      id: 'milestone-1',
      title: 'Release',
      groupId: 'group-1',
      groupTitle: 'Delivery',
    };

    expect(toMilestoneOption(milestone)).toEqual({
      ...milestone,
      label: 'Delivery / Release',
    });
  });
});
