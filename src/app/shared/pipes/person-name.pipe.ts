import { Pipe, PipeTransform } from '@angular/core';
import { NamedPerson, personFullName, personShortName } from '../../core/utils/person-name.utils';

export type { NamedPerson } from '../../core/utils/person-name.utils';

// "Damon Salvatore"
@Pipe({ name: 'personName' })
export class PersonNamePipe implements PipeTransform {
  transform(person?: NamedPerson | null, fallback = 'Unassigned'): string {
    return personFullName(person, fallback);
  }
}

@Pipe({ name: 'personShortName' })
export class PersonShortNamePipe implements PipeTransform {
  transform(person?: NamedPerson | null): string {
    return personShortName(person);
  }
}

// "DS"
@Pipe({ name: 'personInitials' })
export class PersonInitialsPipe implements PipeTransform {
  transform(person?: NamedPerson | null): string {
    if (!person) return '';
    return `${person.name?.[0] ?? ''}${person.surname?.[0] ?? ''}`.toUpperCase() || 'U';
  }
}
