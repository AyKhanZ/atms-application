import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../../store/auth';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-not-found',
  imports: [LanguageSwitcherComponent],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  back(): void {
    void this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.store.dispatch(AuthStoreActions.logout());
  }
}
