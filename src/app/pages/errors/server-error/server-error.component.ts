import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, catchError, finalize, from, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { HealthService } from '../../../core/services/health.service';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Component({
  selector: 'app-server-error',
  imports: [ButtonModule],
  templateUrl: './server-error.component.html',
  styleUrl: './server-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorComponent {
  private readonly auth = inject(AuthSessionService);
  private readonly health = inject(HealthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly isChecking = signal(false);

  tryAgain(): void {
    if (this.isChecking()) {
      return;
    }

    this.isChecking.set(true);
    this.health.check().pipe(
      switchMap(() => from(this.auth.init())),
      finalize(() => this.isChecking.set(false)),
      catchError(() => EMPTY),
    ).subscribe(() => {
      void this.router.navigateByUrl(this.getReturnUrl());
    });
  }

  private getReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('/server-unavailable')) {
      return this.auth.isAuthenticated() ? '/dashboard' : '/login';
    }

    return returnUrl;
  }
}
