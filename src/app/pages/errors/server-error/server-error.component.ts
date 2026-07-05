import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, finalize } from 'rxjs';
import { HealthService } from '../../../core/services/health.service';

@Component({
  selector: 'app-server-error',
  imports: [],
  templateUrl: './server-error.component.html',
  styleUrl: './server-error.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorComponent {
  private readonly health = inject(HealthService);
  private readonly router = inject(Router);

  readonly isChecking = signal(false);

  tryAgain(): void {
    if (this.isChecking()) {
      return;
    }

    this.isChecking.set(true);
    this.health.check().pipe(
      finalize(() => this.isChecking.set(false)),
      catchError(() => EMPTY),
    ).subscribe(() => {
      void this.router.navigateByUrl('/dashboard');
    });
  }
}
