import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommentList } from '../../../../../core/utils/comment-markdown.utils';
import { CommentLookups } from '../../comment-view';
import { CommentInlineComponent } from '../comment-inline/comment-inline.component';

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
  readonly level = input(0);
  // only in the editor preview, in a saved comment a click would change it by accident
  readonly checkable = input(false);

  readonly checkToggled = output<number>();
}
