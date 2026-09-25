/** Anything in the app that carries a person's name: assignee, participant, audit user. */
export interface NamedPerson {
  name?: string | null;
  surname?: string | null;
}

/** "Roman K." for constrained lists and sentences; the full name stays in the tooltip. */
export function personShortName(person?: NamedPerson | null): string {
  if (!person) return 'Unassigned';
  const name = person.name?.trim() ?? '';
  const surname = person.surname?.trim() ?? '';
  return name ? `${name}${surname ? ` ${Array.from(surname)[0]}.` : ''}` : surname || 'Unassigned';
}

/** "Diana Zeynalova", or the fallback when there is nobody. */
export function personFullName(person?: NamedPerson | null, fallback = 'Unassigned'): string {
  if (!person) return fallback;
  return `${person.name ?? ''} ${person.surname ?? ''}`.trim() || fallback;
}
