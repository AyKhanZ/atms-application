import { Pipe, PipeTransform } from '@angular/core';
import { NamedPerson, personFullName, personShortName } from '../../core/utils/person-name.utils';

export type { NamedPerson } from '../../core/utils/person-name.utils';

/**
 * "Diana Zeynalova", or the given fallback when there is nobody.
 *
 * Replaces the per-component `assigneeName` / `participantName` helpers that had drifted into
 * five separate copies with slightly different fallbacks.
 */
@Pipe({ name: 'personName' })
export class PersonNamePipe implements PipeTransform {
  transform(person?: NamedPerson | null, fallback = 'Unassigned'): string {
    return personFullName(person, fallback);
  }
}

/** Short display name for constrained lists; the full name remains in the tooltip. */
@Pipe({ name: 'personShortName' })
export class PersonShortNamePipe implements PipeTransform {
  transform(person?: NamedPerson | null): string {
    return personShortName(person);
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
