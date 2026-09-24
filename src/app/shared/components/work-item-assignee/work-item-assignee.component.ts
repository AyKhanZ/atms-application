import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkItemAssigneeModel } from '../../../core/models/work-items';
import { ProfileAvatarComponent } from '../profile-avatar/profile-avatar.component';
import {
  PersonInitialsPipe,
  PersonNamePipe,
  PersonShortNamePipe,
} from '../../pipes/person-name.pipe';
@Component({
  selector: 'app-work-item-assignee',
  host: { '[class.compact]': 'compact()', '[class.avatar-only]': 'avatarOnly()' },
  imports: [ProfileAvatarComponent, PersonNamePipe, PersonInitialsPipe, PersonShortNamePipe],
  templateUrl: './work-item-assignee.component.html',
  styleUrl: './work-item-assignee.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemAssigneeComponent {
  readonly compact = input(false);
  readonly shortName = input(false);
  readonly avatarOnly = input(false);
  readonly assignee = input<WorkItemAssigneeModel | null | undefined>(null);
}
