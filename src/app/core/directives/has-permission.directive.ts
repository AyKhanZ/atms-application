import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../store/user';

@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly store = inject(Store);
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);

  readonly hasPermission = input.required<string>();

  constructor() {
    effect(() => {
      this.viewContainer.clear();

      if (this.permissions().includes(this.hasPermission())) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}