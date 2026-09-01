import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { UserStoreSelectors } from '../../store/user';
import { Permission } from '../enums/permissions.enum';
import { ProjectPermission } from '../enums/project-permissions.enum';
import { Roles } from '../enums/roles.enum';
import { ProjectAccessService } from '../services/project-access.service';

@Directive({
  selector: '[hasProjectAccess]',
})
export class HasProjectAccessDirective {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly store = inject(Store);
  private readonly projectAccess = inject(ProjectAccessService);
  private readonly templateRef = inject(TemplateRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);
  private readonly permissions = this.store.selectSignal(UserStoreSelectors.getPermissions);
  private hasView = false;

  readonly hasProjectAccess = input.required<ProjectPermission | string>();
  readonly hasProjectAccessSystem = input<Permission | string | null>(null);
  readonly hasProjectAccessProjectId = input<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const projectId = this.hasProjectAccessProjectId() ?? this.route?.snapshot.paramMap.get('projectId');
      if (!projectId || !this.hasSystemAccess()) {
        this.render(false);
        return;
      }

      this.projectAccess.version(projectId);
      const subscription: Subscription = this.projectAccess
        .hasPermission(projectId, this.hasProjectAccess())
        .subscribe((hasProjectAccess) => this.render(hasProjectAccess));

      onCleanup(() => subscription.unsubscribe());
    });
  }

  private hasSystemAccess(): boolean {
    const systemPermission = this.hasProjectAccessSystem();
    if (!systemPermission) return true;

    return this.roles().some((role) => role.code === Roles.SuperAdmin) ||
      this.permissions().includes(systemPermission);
  }

  private render(canRender: boolean): void {
    if (canRender && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
      return;
    }

    if (!canRender && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
