import { withoutInactive } from './assignee-options.utils';

describe('withoutInactive', () => {
  const people = [
    { id: 'active', isActive: true },
    { id: 'gone', isActive: false },
    { id: 'kept', isActive: false },
  ];

  it('leaves inactive people out except the one already on the item', () => {
    expect(withoutInactive(people, 'kept').map((person) => person.id)).toEqual(['active', 'kept']);
  });

  it('leaves every inactive person out on a new item', () => {
    expect(withoutInactive(people, null).map((person) => person.id)).toEqual(['active']);
  });
});
