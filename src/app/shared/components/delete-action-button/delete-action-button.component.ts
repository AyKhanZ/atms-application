import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-delete-action-button',
  imports: [],
  templateUrl: './delete-action-button.component.html',
  styleUrl: './delete-action-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteActionButtonComponent {
  readonly clicked = output<void>();
}