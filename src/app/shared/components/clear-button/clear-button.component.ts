import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-clear-button',
  imports: [TranslocoDirective],
  templateUrl: './clear-button.component.html',
  styleUrl: './clear-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearButtonComponent {
  readonly clicked = output<void>();
}
