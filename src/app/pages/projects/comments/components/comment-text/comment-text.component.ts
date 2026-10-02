import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommentReferenceModel } from '../../../../../core/models/comments';
import { MentionPerson } from '../../../../../core/utils/comment-editor.utils';
import { parseCommentMarkdown } from '../../../../../core/utils/comment-markdown.utils';
import { commentLookups } from '../../comment-view';
import { CommentInlineComponent } from '../comment-inline/comment-inline.component';
import { CommentListComponent } from '../comment-list/comment-list.component';

/** A comment's text with its markup drawn: paragraphs, lists and the lines inside them. */
@Component({
  selector: 'app-comment-text',
  imports: [CommentInlineComponent, CommentListComponent],
  templateUrl: './comment-text.component.html',
  styleUrl: './comment-text.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentTextComponent {
  readonly text = input.required<string>();
  readonly mentions = input<readonly MentionPerson[]>([]);
  readonly references = input<readonly CommentReferenceModel[]>([]);
  /** The editor's preview: a click ticks the check list in the text being written. */
  readonly checkable = input(false);

  /** The line of the check-list item clicked. */
  readonly checkToggled = output<number>();

  readonly blocks = computed(() => parseCommentMarkdown(this.text()));
  readonly lookups = computed(() => commentLookups(this.mentions(), this.references()));
}
