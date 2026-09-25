import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * "Load more" under a list or at the bottom of a dropdown. One button for every paged list, so none
 * of them draws its own: it existed in three looks — the quiet button, a PrimeNG outlined button and
 * two hand-made ones.
 */
@Component({
  selector: 'app-load-more-button',
  templateUrl: './load-more-button.component.html',
  styleUrl: './load-more-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadMoreButtonComponent {
  /** The next page is on its way: the button spins and cannot be pressed twice. */
  readonly loading = input(false);
  /** Smaller, for the bottom of a dropdown panel, where the full button outweighs the options. */
  readonly compact = input(false);

  /** The click itself, so a dropdown can stop it from closing the panel. */
  readonly clicked = output<MouseEvent>();
}
