import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-create-button',
  templateUrl: './create-button.component.html',
  styleUrl: './create-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateButtonComponent {
  readonly label = input('Create');
  readonly title = input('Create new item');
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
