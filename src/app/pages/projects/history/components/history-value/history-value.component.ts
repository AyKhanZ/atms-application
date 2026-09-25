import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HistoryEntityType } from '../../../../../core/enums/history-entity-type.enum';
import { HistoryField } from '../../../../../core/enums/history-field.enum';
import { HistoryValueModel } from '../../../../../core/models/history';
import { WorkItemKind } from '../../../../../core/models/work-items';
import { WorkItemAssigneeComponent } from '../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { WorkItemPriorityComponent } from '../../../../../shared/components/work-item-priority/work-item-priority.component';
import { WorkItemRefComponent } from '../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemTypeComponent } from '../../../../../shared/components/work-item-type/work-item-type.component';
import { HistoryDatePipe, HistoryDictionaryPipe } from '../../../../../shared/pipes/history.pipe';
import { ProjectStatusBadgeComponent } from '../../../components/status-badge/project-status-badge.component';
import { WorkGroupStatusBadgeComponent } from '../../../details/tabs/groups/components/work-group-status-badge/work-group-status-badge.component';
import { TaskStatusBadgeComponent } from '../../../tasks/components/task-status-badge/task-status-badge.component';
import { TicketStatusBadgeComponent } from '../../../tickets/components/ticket-status-badge/ticket-status-badge.component';

/** One old or new value, drawn the way the same value looks everywhere else in the app. */
@Component({
  selector: 'app-history-value',
  imports: [
    RouterLink,
    HistoryDatePipe,
    HistoryDictionaryPipe,
    ProjectStatusBadgeComponent,
    TaskStatusBadgeComponent,
    TicketStatusBadgeComponent,
    WorkGroupStatusBadgeComponent,
    WorkItemAssigneeComponent,
    WorkItemPriorityComponent,
    WorkItemRefComponent,
    WorkItemTypeComponent,
  ],
  templateUrl: './history-value.component.html',
  styleUrl: './history-value.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryValueComponent {
  protected readonly fields = HistoryField;
  protected readonly entityTypes = HistoryEntityType;
  protected readonly kinds = WorkItemKind;

  readonly field = input.required<HistoryField>();
  readonly value = input.required<HistoryValueModel>();
  readonly entityType = input.required<HistoryEntityType>();
  readonly projectId = input.required<string>();
  /** Only the dot of a status: for a mark whose status is named elsewhere. */
  readonly dotOnly = input(false);
  /** A value that was replaced: every kind of value draws itself grey and struck through. */
  readonly muted = input(false);
}
