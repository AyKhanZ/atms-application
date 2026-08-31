import { Pipe, PipeTransform } from '@angular/core';

/** Anything in the app that carries a person's name: assignee, participant, audit user. */
export interface NamedPerson {
  name?: string | null;
  surname?: string | null;
}

/**
 * "Diana Zeynalova", or the given fallback when there is nobody.
 *
 * Replaces the per-component `assigneeName` / `participantName` helpers that had drifted into
 * five separate copies with slightly different fallbacks.
 */
@Pipe({ name: 'personName' })
export class PersonNamePipe implements PipeTransform {
  transform(person?: NamedPerson | null, fallback = 'Unassigned'): string {
    if (!person) return fallback;
    return `${person.name ?? ''} ${person.surname ?? ''}`.trim() || fallback;
  }
}

/** "DZ" — the avatar fallback shown while there is no picture. */
@Pipe({ name: 'personInitials' })
export class PersonInitialsPipe implements PipeTransform {
  transform(person?: NamedPerson | null): string {
    if (!person) return '';
    return `${person.name?.[0] ?? ''}${person.surname?.[0] ?? ''}`.toUpperCase() || 'U';
  }
}
