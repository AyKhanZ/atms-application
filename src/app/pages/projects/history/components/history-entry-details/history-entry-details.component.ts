import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HistoryAction } from '../../../../../core/enums/history-action.enum';
import { HistoryField } from '../../../../../core/enums/history-field.enum';
import { HistoryEntryModel } from '../../../../../core/models/history';
import { HistorySubject } from '../../../../../core/utils/history.utils';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { WorkItemAssigneeComponent } from '../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import {
  HistoryFieldLabelPipe,
  HistorySummaryPipe,
  HistoryTimePipe,
} from '../../../../../shared/pipes/history.pipe';
import { PersonNamePipe } from '../../../../../shared/pipes/person-name.pipe';
import { HistoryAuthorAvatarComponent } from '../history-author-avatar/history-author-avatar.component';
import { HistoryValueComponent } from '../history-value/history-value.component';

/** What exactly one entry changed: every field with its new value and the one it replaced. */
@Component({
  selector: 'app-history-entry-details',
  imports: [
    EmptyStateComponent,
    HistoryAuthorAvatarComponent,
    HistoryFieldLabelPipe,
    HistorySummaryPipe,
    HistoryTimePipe,
    HistoryValueComponent,
    PersonNamePipe,
    WorkItemAssigneeComponent,
  ],
  templateUrl: './history-entry-details.component.html',
  styleUrl: './history-entry-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryEntryDetailsComponent {
  protected readonly fields = HistoryField;

  readonly entry = input.required<HistoryEntryModel>();
  readonly subject = input.required<HistorySubject>();
  readonly projectId = input.required<string>();

  readonly created = computed(() => this.entry().action === HistoryAction.Created);
  readonly deleted = computed(() => this.entry().action === HistoryAction.Deleted);
  /** Created before the history was kept: the values it started with were never written down. */
  readonly unrecorded = computed(() => this.created() && !this.entry().changes.length);
}
