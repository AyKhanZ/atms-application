import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

type SnackBarType = 'success' | 'error' | 'warn' | 'info';

const SEVERITIES: Record<SnackBarType, 'success' | 'error' | 'warn' | 'info'> = {
  success: 'success',
  error: 'error',
  warn: 'warn',
  info: 'info',
};

@Injectable({ providedIn: 'root' })
export class SnackBarService {
  private readonly messageService = inject(MessageService);

  show(message: string, type: SnackBarType = 'info', duration = 4000): void {
    this.messageService.add({
      severity: SEVERITIES[type],
      summary: this.getSummary(type),
      detail: message,
      life: duration,
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

  private getSummary(type: SnackBarType): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warn':
        return 'Warning';
      default:
        return 'Info';
    }
  }
}
