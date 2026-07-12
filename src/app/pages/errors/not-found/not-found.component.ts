import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthStoreActions } from '../../../store/auth';

@Component({
  selector: 'app-not-found',
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
