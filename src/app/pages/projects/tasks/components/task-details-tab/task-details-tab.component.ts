import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { TicketPriorityBadgeComponent } from '../../../tickets/components/ticket-priority-badge/ticket-priority-badge.component';
import { TaskStatusBadgeComponent } from '../task-status-badge/task-status-badge.component';

@Component({
  selector: 'app-task-details-tab',
  imports: [
    DatePipe,
    RouterLink,
    PersonNamePipe,
    TicketPriorityBadgeComponent,
    TaskStatusBadgeComponent,
  ],
  templateUrl: './task-details-tab.component.html',
  styleUrl: './task-details-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskDetailsTabComponent {
  readonly task = input.required<WorkTaskModel>();
}
