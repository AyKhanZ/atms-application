import { Component, computed, inject, signal } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { LanguageSwitcherComponent } from '../language-switcher/language-switcher.component';
import { UserStoreSelectors } from '../../../store/user';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../../store/auth';
import { Router } from '@angular/router';
import { ImageUrlService } from '../../../core/services/image-url.service';
import { LayoutService } from '../../../core/services/layout.service';
import { isSuperAdmin } from '../../../core/utils/super-admin.utils';
import { currentLanguage } from '../../../core/i18n/active-language';

@Component({
  selector: 'app-topbar',
  imports: [MenuModule, GlobalSearchComponent, NotificationBellComponent, LanguageSwitcherComponent, TranslocoDirective],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly imageUrlService = inject(ImageUrlService);
  readonly layout = inject(LayoutService);
  private readonly transloco = inject(TranslocoService);
  isMenuOpen = signal(false);
  meModel = this.store.selectSignal(UserStoreSelectors.getMe);
  avatarUrl = computed(() => this.imageUrlService.normalizeAvatar(this.meModel()?.avatarPath));
  private readonly roles = this.store.selectSignal(UserStoreSelectors.getRoles);
  readonly userMenuItems = computed<MenuItem[]>(() => {
    currentLanguage();
    return [
      ...(isSuperAdmin(this.roles())
        ? []
        : [
            {
              label: this.transloco.translate('nav.settings'),
              icon: 'pi pi-cog',
              command: () => this.openSettings(),
            },
            { separator: true },
          ]),
      {
        label: this.transloco.translate('nav.logOut'),
        icon: 'pi pi-sign-out',
        styleClass: 'user-menu__logout',
        command: () => this.logout(),
      },
    ];
  });

  logout(): void {
    this.store.dispatch(AuthStoreActions.logout());
  }

  openSettings(): void {
    void this.router.navigate(['/settings']);
  }
}
