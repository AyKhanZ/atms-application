import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkItemAssigneeModel } from '../../../core/models/work-items';
import { ProfileAvatarComponent } from '../profile-avatar/profile-avatar.component';
import { PersonInitialsPipe, PersonNamePipe } from '../../pipes/person-name.pipe';
@Component({
  selector: 'app-work-item-assignee',
  host: { '[class.compact]': 'compact()' },
  imports: [ProfileAvatarComponent, PersonNamePipe, PersonInitialsPipe],
  templateUrl: './work-item-assignee.component.html',
  styleUrl: './work-item-assignee.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemAssigneeComponent {
  readonly compact = input(false);
  readonly assignee = input<WorkItemAssigneeModel | null | undefined>(null);
}
