import { AppDatePipe } from '../../pipes/app-date.pipe';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { WorkItemPriorityComponent } from '../work-item-priority/work-item-priority.component';
import { WorkItemTypeComponent } from '../work-item-type/work-item-type.component';
import { DeadlineLabelPipe, IsOverduePipe } from '../../pipes/deadline.pipe';
import { WorkItemAssigneeComponent } from '../work-item-assignee/work-item-assignee.component';
import { OverdueBadgeComponent } from '../overdue-badge/overdue-badge.component';
import { WorkItemFacts } from './work-item-facts.model';

@Component({
  selector: 'app-work-item-facts',
  imports: [
    AppDatePipe,
    WorkItemPriorityComponent,
    WorkItemTypeComponent,
    DeadlineLabelPipe,
    IsOverduePipe,
    WorkItemAssigneeComponent,
    OverdueBadgeComponent,
  ],
  templateUrl: './work-item-facts.component.html',
  styleUrl: './work-item-facts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemFactsComponent {
  readonly facts = input.required<WorkItemFacts>();
}
