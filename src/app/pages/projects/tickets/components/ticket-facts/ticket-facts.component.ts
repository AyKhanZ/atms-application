import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { ProfileAvatarComponent } from '../../../../../shared/components/profile-avatar/profile-avatar.component';
import { DeadlineLabelPipe, IsOverduePipe } from '../../../../../shared/pipes/deadline.pipe';
import {
  PersonInitialsPipe,
  PersonNamePipe,
} from '../../../../../shared/pipes/person-name.pipe';
import { TicketPriorityBadgeComponent } from '../ticket-priority-badge/ticket-priority-badge.component';
import { TicketTypeBadgeComponent } from '../ticket-type-badge/ticket-type-badge.component';

/** The Type / Priority / Assignee / Deadline list in the right-hand column of Ticket details. */
@Component({
  selector: 'app-ticket-facts',
  imports: [
    DatePipe,
    ProfileAvatarComponent,
    TicketTypeBadgeComponent,
    TicketPriorityBadgeComponent,
    PersonNamePipe,
    PersonInitialsPipe,
    DeadlineLabelPipe,
    IsOverduePipe,
  ],
  templateUrl: './ticket-facts.component.html',
  styleUrl: './ticket-facts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketFactsComponent {
  readonly ticket = input.required<WorkTicketModel>();
}
