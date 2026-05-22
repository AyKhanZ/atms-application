import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  SnackBarComponent,
  SnackBarData,
} from '../../shared/components/snack-bar/snack-bar.component';

const PANEL_COLORS: Record<SnackBarData['type'], string> = {
  success: 'success',
  error: 'error',
  warn: 'warn',
  info: 'info',
};

@Injectable({ providedIn: 'root' })
export class SnackBarService {
  private snackBar = inject(MatSnackBar);

  show(message: string, type: SnackBarData['type'] = 'info', duration = 4000) {
    this.snackBar.openFromComponent(SnackBarComponent, {
      data: { message, type } satisfies SnackBarData,
      panelClass: [PANEL_COLORS[type]],
      duration,
      horizontalPosition: 'right',
      verticalPosition: 'bottom',
    });
  }

  success(message: string) {
    this.show(message, 'success');
  }

  error(message: string) {
    this.show(message, 'error');
  }

  warn(message: string) {
    this.show(message, 'warn');
  }

  info(message: string) {
    this.show(message, 'info');
  }
}
