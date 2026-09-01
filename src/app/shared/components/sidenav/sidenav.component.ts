import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HasPermissionDirective } from '../../../core/directives/has-permission.directive';
import { Permissions } from '../../../core/enums/permissions.enum';
import { LayoutService } from '../../../core/services/layout.service';

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive, HasPermissionDirective],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
})
export class SidenavComponent {
  readonly layout = inject(LayoutService);
  readonly Permissions = Permissions;
}
