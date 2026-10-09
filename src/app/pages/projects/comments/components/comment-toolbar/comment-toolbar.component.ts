import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ListKind } from '../../../../../core/utils/comment-editor.utils';
import { HighlightColor } from '../../../../../core/utils/comment-markdown.utils';
import { HighlightPickerComponent } from '../highlight-picker/highlight-picker.component';

export type CommentFormat = 'bold' | 'italic' | 'code' | 'link' | ListKind;

// only says which tool was pressed, the editor applies it
@Component({
  selector: 'app-comment-toolbar',
  imports: [HighlightPickerComponent, TranslocoDirective],
  templateUrl: './comment-toolbar.component.html',
  styleUrl: './comment-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentToolbarComponent {
  // for screen readers: "Comment formatting"
  readonly label = input('');

  readonly triggered = output<'@' | '#'>();
  readonly formatted = output<CommentFormat>();
  readonly highlighted = output<HighlightColor>();

  private readonly picker = viewChild.required(HighlightPickerComponent);

  closePalette(): void {
    this.picker().close();
  }
}
