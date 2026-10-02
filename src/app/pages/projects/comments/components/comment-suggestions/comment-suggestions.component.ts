import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { CommentSuggestion } from '../../comment-suggestion';

/**
 * The list under the editor while `@` or `#` is typed. Focus stays in the text field: the arrows
 * move the active row from there, so the list only draws it.
 */
@Component({
  selector: 'app-comment-suggestions',
  imports: [PersonInitialsPipe, PersonNamePipe, ProfileAvatarComponent, WorkItemRefComponent],
  templateUrl: './comment-suggestions.component.html',
  styleUrl: './comment-suggestions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentSuggestionsComponent {
  readonly listId = input.required<string>();
  readonly items = input.required<readonly CommentSuggestion[]>();
  readonly activeIndex = input(0);
  readonly loading = input(false);
  /** What the list is for: "@" people or "#" work. */
  readonly trigger = input.required<'@' | '#'>();
  /** A line under the rows saying how to find more; none for people. */
  readonly hint = input<string | null>(null);
  /** Work from this project goes without the project's name: the reader is already in it. */
  readonly currentProjectId = input<string | null>(null);

  readonly picked = output<number>();
}
