import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-delete-action-button',
  imports: [TranslocoDirective],
  templateUrl: './delete-action-button.component.html',
  styleUrl: './delete-action-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteActionButtonComponent {
  readonly clicked = output<void>();
}
