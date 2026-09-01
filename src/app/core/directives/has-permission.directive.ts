import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';
import { Roles } from '../enums/roles.enum';

@Directive({
  selector: '[hasPermission]',
})
export class HasPermissionDirective {
  private readonly store = inject(Store);
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);
  private readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);

  readonly hasPermission = input.required<string>();

  constructor() {
    effect(() => {
      this.viewContainer.clear();

      const isSuperAdmin = this.roles().some((role) => role.code === Roles.SuperAdmin);
      if (isSuperAdmin || this.permissions().includes(this.hasPermission())) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}
