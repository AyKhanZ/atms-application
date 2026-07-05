import { Component, input } from '@angular/core';

export interface SnackBarData {
  message: string;
  type: 'success' | 'error' | 'warn' | 'info';
}

const CONFIG = {
  success: { icon: 'check_circle', color: '#ffffff' },
  error: { icon: 'error', color: '#ffffff' },
  warn: { icon: 'warning', color: '#222222' },
  info: { icon: 'info', color: '#ffffff' },
};

@Component({
  selector: 'app-snack-bar',
  standalone: true,
  templateUrl: './snack-bar.component.html',
  styleUrl: './snack-bar.component.scss',
})
export class SnackBarComponent {
  data = input.required<SnackBarData>();

  get config() {
    return CONFIG[this.data().type];
  }
}
