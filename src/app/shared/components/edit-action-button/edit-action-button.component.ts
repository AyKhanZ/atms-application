import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

@Component({
  selector: 'app-edit-action-button',
  imports: [TranslocoDirective],
  templateUrl: './edit-action-button.component.html',
  styleUrl: './edit-action-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditActionButtonComponent {
  readonly clicked = output<void>();
}
