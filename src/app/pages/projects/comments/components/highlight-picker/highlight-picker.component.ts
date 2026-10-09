import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { HIGHLIGHT_COLORS, HighlightColor } from '../../../../../core/utils/comment-markdown.utils';

// button shows the last color; same color on a marked selection takes it off
@Component({
  selector: 'app-highlight-picker',
  imports: [TranslocoDirective],
  templateUrl: './highlight-picker.component.html',
  styleUrl: './highlight-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HighlightPickerComponent {
  readonly picked = output<HighlightColor>();

  protected readonly colors = HIGHLIGHT_COLORS;
  protected readonly color = signal<HighlightColor>('yellow');
  protected readonly open = signal(false);

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
