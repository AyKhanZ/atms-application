import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-edit-action-button',
  imports: [],
  templateUrl: './edit-action-button.component.html',
  styleUrl: './edit-action-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditActionButtonComponent {
  readonly clicked = output<void>();
}