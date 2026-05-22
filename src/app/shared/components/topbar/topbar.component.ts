import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { BreadcrumbsComponent } from '../breadcrumbs/breadcrumbs.component';
import { UserStoreSelectors } from '../../../store/user';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../../store/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    BreadcrumbsComponent,
  ],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  isMenuOpen = signal(false);
  meModel = this.store.selectSignal(UserStoreSelectors.getMe);

  logout(): void {
    this.store.dispatch(AuthStoreActions.logout());
  }

  onToggleSettings(): void {
    console.log('Do letter !');
    this.router.navigate(['settings']);
  }

  onToggleHelp(): void {
    console.log('Do letter !');
  }
}
