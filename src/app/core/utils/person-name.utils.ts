export interface NamedPerson {
  name?: string | null;
  surname?: string | null;
}

// "Roman K."
export function personShortName(person?: NamedPerson | null): string {
  if (!person) return 'Unassigned';
  const name = person.name?.trim() ?? '';
  const surname = person.surname?.trim() ?? '';
  return name ? `${name}${surname ? ` ${Array.from(surname)[0]}.` : ''}` : surname || 'Unassigned';
}

// "Diana Zeynalova"
export function personFullName(person?: NamedPerson | null, fallback = 'Unassigned'): string {
  if (!person) return fallback;
  return `${person.name ?? ''} ${person.surname ?? ''}`.trim() || fallback;
}
