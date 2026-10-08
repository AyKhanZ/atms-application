import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-load-more-button',
  templateUrl: './load-more-button.component.html',
  styleUrl: './load-more-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMoreButtonComponent {
  readonly loading = input(false);
  // for the bottom of a dropdown
  readonly compact = input(false);

  // so a dropdown can stop it from closing the panel
  readonly clicked = output<MouseEvent>();
}
