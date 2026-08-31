import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { TicketMilestoneJumpComponent } from '../ticket-milestone-jump/ticket-milestone-jump.component';

/**
 * Where the ticket sits in the project plan: the group → milestone path, the switcher for
 * sibling tickets, and the one way out to the Plan tab.
 *
 * The group and milestone are deliberately not links — they are layers inside the Plan tab
 * rather than pages of their own, so navigating to them goes through "View in Plan".
 */
@Component({
  selector: 'app-ticket-location',
  imports: [ButtonModule, TicketMilestoneJumpComponent],
  templateUrl: './ticket-location.component.html',
  styleUrl: './ticket-location.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketLocationComponent {
  readonly ticket = input.required<WorkTicketModel>();

  readonly viewInPlan = output<void>();
}
