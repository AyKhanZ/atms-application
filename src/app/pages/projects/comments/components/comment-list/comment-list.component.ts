import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommentList } from '../../../../../core/utils/comment-markdown.utils';
import { CommentLookups } from '../../comment-view';
import { CommentInlineComponent } from '../comment-inline/comment-inline.component';

/**
 * One list of a comment — bulleted, numbered or a check list — with the lists nested under its
 * items drawn by itself, one level deeper each time: ● ○ ■, 1 a i.
 */
@Component({
  selector: 'app-comment-list',
  imports: [CommentInlineComponent],
  templateUrl: './comment-list.component.html',
  styleUrl: './comment-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-level]': 'level()' },
})
export class CommentListComponent {
  readonly list = input.required<CommentList>();
  readonly lookups = input.required<CommentLookups>();
  /** 0 for a list at the left edge; its marker changes with each level. */
  readonly level = input(0);
  /**
   * Ticked by a click only in the editor's preview. In a saved comment a click would change it by
   * accident, past the hidden Edit.
   */
  readonly checkable = input(false);

  /** The line of the check-list item clicked. */
  readonly checkToggled = output<number>();
}
