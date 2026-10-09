import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { CommentSuggestion } from '../../comment-suggestion';

// focus stays in the text field, the arrows move the active row from there
@Component({
  selector: 'app-comment-suggestions',
  imports: [PersonInitialsPipe, PersonNamePipe, ProfileAvatarComponent, TranslocoDirective, WorkItemRefComponent],
  templateUrl: './comment-suggestions.component.html',
  styleUrl: './comment-suggestions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentSuggestionsComponent {
  readonly listId = input.required<string>();
  readonly items = input.required<readonly CommentSuggestion[]>();
  readonly activeIndex = input(0);
  readonly loading = input(false);
  readonly trigger = input.required<'@' | '#'>();
  // none for people
  readonly hint = input<string | null>(null);
  readonly currentProjectId = input<string | null>(null);

  readonly picked = output<number>();
}
