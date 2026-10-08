import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PersonModel } from '../../../../../core/models/person.model';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';

// gear = nobody made it by hand
@Component({
  selector: 'app-history-author-avatar',
  imports: [ProfileAvatarComponent, PersonInitialsPipe, PersonNamePipe],
  templateUrl: './history-author-avatar.component.html',
  styleUrl: './history-author-avatar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryAuthorAvatarComponent {
  readonly author = input<PersonModel | null | undefined>(null);
}
