import { Component, HostListener, computed, inject } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Permissions } from '../../../core/enums/permissions.enum';
import { LayoutService } from '../../../core/services/layout.service';
import { Store } from '@ngrx/store';
import { UserStoreSelectors } from '../../../store/user';
import { isSuperAdmin } from '../../../core/utils/super-admin.utils';

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive, HasPermissionDirective, TranslocoDirective],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
})
export class SidenavComponent {
  readonly layout = inject(LayoutService);
  readonly Permissions = Permissions;
  private readonly roles = inject(Store).selectSignal(UserStoreSelectors.getRoles);
  readonly isSuperAdmin = computed(() => isSuperAdmin(this.roles()));

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.layout.closeDrawer();
  }
}
