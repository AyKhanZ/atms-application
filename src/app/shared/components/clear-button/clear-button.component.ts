import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-clear-button',
  templateUrl: './clear-button.component.html',
  styleUrl: './clear-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClearButtonComponent {
  readonly clicked = output<void>();
}
