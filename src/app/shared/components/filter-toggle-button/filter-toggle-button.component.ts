import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-filter-toggle-button',
  templateUrl: './filter-toggle-button.component.html',
  styleUrl: './filter-toggle-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterToggleButtonComponent {
  readonly active = input(false);
  readonly count = input(0);
  readonly label = input('Filter');
  readonly disabled = input(false);
  readonly clicked = output<void>();
}
