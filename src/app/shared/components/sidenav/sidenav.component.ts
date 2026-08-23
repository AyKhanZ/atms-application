import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '@ngrx/store';
import { Roles } from '../../../core/enums/roles.enum';
import { LayoutService } from '../../../core/services/layout.service';
import { UserStoreSelectors } from '../../../store/user';

@Component({
  selector: 'app-sidenav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidenav.component.html',
  styleUrl: './sidenav.component.scss',
})
export class SidenavComponent {
  private readonly store = inject(Store);
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);

  readonly layout = inject(LayoutService);
  readonly canManageAdministration = computed(() => this.roles().some((role) => role.code === Roles.SuperAdmin));
}
