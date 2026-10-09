import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { CommentInline } from '../../../../../core/utils/comment-markdown.utils';
import { PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { CommentLookups } from '../../comment-view';
import { CommentReferenceComponent } from '../comment-reference/comment-reference.component';

@Component({
  selector: 'app-comment-inline',
  imports: [CommentReferenceComponent, PersonNamePipe, TranslocoDirective],
  templateUrl: './comment-inline.component.html',
  styleUrl: './comment-inline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentInlineComponent {
  readonly tokens = input.required<readonly CommentInline[]>();
  readonly lookups = input.required<CommentLookups>();
}
