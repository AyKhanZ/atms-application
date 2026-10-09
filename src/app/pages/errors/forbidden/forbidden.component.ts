import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../../store/auth';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-forbidden',
  imports: [LanguageSwitcherComponent],
  templateUrl: './forbidden.component.html',
  styleUrl: './forbidden.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenComponent {
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  back(): void {
    void this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.store.dispatch(AuthStoreActions.logout());
  }
}
