import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DictionaryModel } from '../../../core/models/dictionary.model';
import { WorkItemKind } from '../../../core/models/work-items';
import { ProjectStatusBadgeComponent } from '../../../pages/projects/components/status-badge/project-status-badge.component';
import { TaskStatusBadgeComponent } from '../../../pages/projects/tasks/components/task-status-badge/task-status-badge.component';
import { TicketStatusBadgeComponent } from '../../../pages/projects/tickets/components/ticket-status-badge/ticket-status-badge.component';

// for lists that mix kinds (search, comment links), each kind has its own scale
@Component({
  selector: 'app-work-item-status-badge',
  imports: [ProjectStatusBadgeComponent, TaskStatusBadgeComponent, TicketStatusBadgeComponent],
  template: `
    @switch (kind()) {
      @case (kinds.Project) {
        <app-project-status-badge [status]="status()" [dotOnly]="dotOnly()" />
      }
      @case (kinds.Ticket) {
        <app-ticket-status-badge [status]="status()" [dotOnly]="dotOnly()" />
      }
      @default {
        <app-task-status-badge [status]="status()" [dotOnly]="dotOnly()" />
      }
    }
  `,
  styles: ':host { display: inline-flex; min-width: 0; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemStatusBadgeComponent {
  readonly kind = input.required<WorkItemKind>();
  readonly status = input.required<DictionaryModel>();
  readonly dotOnly = input(false);

  protected readonly kinds = WorkItemKind;
}
