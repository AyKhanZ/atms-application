import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';

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
  imports: [MatIconModule],
  templateUrl: './snack-bar.component.html',
  styleUrl: './snack-bar.component.scss',
})
export class SnackBarComponent {
  data: SnackBarData = inject(MAT_SNACK_BAR_DATA);
  config = CONFIG[this.data.type];
}
