import { Component, computed, inject, signal } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component';
import { UserStoreSelectors } from '../../../store/user';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../../store/auth';
import { Router } from '@angular/router';
import { ImageUrlService } from '../../../core/services/image-url.service';

@Component({
  selector: 'app-topbar',
  imports: [MenuModule, BreadcrumbsComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly imageUrlService = inject(ImageUrlService);
  isMenuOpen = signal(false);
  meModel = this.store.selectSignal(UserStoreSelectors.getMe);
  avatarUrl = computed(() => this.imageUrlService.normalizeAvatar(this.meModel()?.avatarPath));
  readonly userMenuItems: MenuItem[] = [
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => this.onToggleSettings(),
    },
    {
      separator: true,
    },
    {
      label: 'Logout',
      icon: 'pi pi-sign-out',
      styleClass: 'user-menu__logout',
      command: () => this.logout(),
    },
  ];

  logout(): void {
    this.store.dispatch(AuthStoreActions.logout());
  }

  onToggleSettings(): void {
    console.log('Do letter !');
    this.router.navigate(['settings']);
  }
}
