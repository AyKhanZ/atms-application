import { NamedPerson, PersonShortNamePipe } from './person-name.pipe';

describe('PersonShortNamePipe', () => {
  const pipe = new PersonShortNamePipe();

  it.each<[NamedPerson | null | undefined, string]>([
    [{ name: 'Diana', surname: 'Zeynalova' }, 'Diana Z.'],
    [{ name: ' Diana ', surname: ' Zeynalova ' }, 'Diana Z.'],
    [{ name: 'Алина', surname: 'Иванова' }, 'Алина И.'],
    [{ name: 'Diana' }, 'Diana'],
    [{ surname: 'Zeynalova' }, 'Zeynalova'],
    [{ name: ' ', surname: ' ' }, 'Unassigned'],
    [null, 'Unassigned'],
    [undefined, 'Unassigned'],
  ])('formats %j as %s', (person, expected) => {
    expect(pipe.transform(person)).toBe(expected);
  });
});
