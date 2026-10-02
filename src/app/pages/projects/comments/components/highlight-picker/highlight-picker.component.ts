import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { HIGHLIGHT_COLORS, HighlightColor } from '../../../../../core/utils/comment-markdown.utils';

/**
 * One control for the highlight: the button shows the colour used last and opens the palette; a
 * colour marks the selection, the same colour on a marked selection takes the mark off.
 */
@Component({
  selector: 'app-highlight-picker',
  templateUrl: './highlight-picker.component.html',
  styleUrl: './highlight-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightPickerComponent {
  readonly picked = output<HighlightColor>();

  protected readonly colors = HIGHLIGHT_COLORS;
  protected readonly color = signal<HighlightColor>('yellow');
  protected readonly open = signal(false);

  /** The editor closes the palette when the focus leaves it. */
  close(): void {
    this.open.set(false);
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  protected pick(color: HighlightColor): void {
    this.color.set(color);
    this.open.set(false);
    this.picked.emit(color);
  }
}
