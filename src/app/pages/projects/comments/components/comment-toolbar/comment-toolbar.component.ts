import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';
import { ListKind } from '../../../../../core/utils/comment-editor.utils';
import { HighlightColor } from '../../../../../core/utils/comment-markdown.utils';
import { HighlightPickerComponent } from '../highlight-picker/highlight-picker.component';

export type CommentFormat = 'bold' | 'italic' | 'code' | 'link' | ListKind;

/**
 * The formatting row under the editor, as in Azure DevOps: @ and #, then the marks, then the lists.
 * It only says which tool was pressed; the editor applies it to the text and the selection.
 */
@Component({
  selector: 'app-comment-toolbar',
  imports: [HighlightPickerComponent],
  templateUrl: './comment-toolbar.component.html',
  styleUrl: './comment-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentToolbarComponent {
  /** What the editor is called, for the screen reader: "Comment formatting". */
  readonly label = input('Comment');

  readonly triggered = output<'@' | '#'>();
  readonly formatted = output<CommentFormat>();
  readonly highlighted = output<HighlightColor>();

  private readonly picker = viewChild.required(HighlightPickerComponent);

  /** The editor closes the palette when the focus leaves it. */
  closePalette(): void {
    this.picker().close();
  }
}
