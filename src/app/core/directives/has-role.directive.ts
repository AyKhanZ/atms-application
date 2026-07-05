import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';
import { Role } from '../enums/roles.enum';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private readonly store = inject(Store);
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);

  readonly hasRole = input.required<Role | string>();

  constructor() {
    effect(() => {
      const role = normalize(this.hasRole());
      this.viewContainer.clear();

      if (
        this.roles().some((item) =>
          normalize(item.code) === role || normalize(item.name) === role)
      ) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}

function normalize(value: string | undefined): string {
  return value?.replace(/\s+/g, '').toLowerCase() ?? '';
}
