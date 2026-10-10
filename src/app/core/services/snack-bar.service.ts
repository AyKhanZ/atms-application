import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

type SnackBarType = 'success' | 'error' | 'warn' | 'info';

const SEVERITIES: Record<SnackBarType, 'success' | 'error' | 'warn' | 'info'> = {
  success: 'success',
  error: 'error',
  warn: 'warn',
  info: 'info',
};

const DUPLICATE_DETAIL_MS = 3_000;

@Injectable({ providedIn: 'root' })
export class SnackBarService {
  private readonly messageService = inject(MessageService);
  private lastDetail: string | null = null;
  private lastDetailAt = 0;

  show(message: string, type: SnackBarType = 'info', duration = 4000): void {
    const now = Date.now();
    if (this.lastDetail === message && now - this.lastDetailAt < DUPLICATE_DETAIL_MS) return;

    this.lastDetail = message;
    this.lastDetailAt = now;
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
