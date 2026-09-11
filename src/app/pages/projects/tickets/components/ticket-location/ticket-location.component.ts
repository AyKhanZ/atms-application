import { WorkItemJumpComponent } from '../../../../../shared/components/work-item-jump/work-item-jump.component';
import { WorkItemJumpState } from '../../../../../shared/components/work-item-jump/work-item-jump-state';
import { WorkItemJumpContext } from '../../../../../shared/components/work-item-jump/work-item-jump-context';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { Router } from '@angular/router';

/**
 * Where the ticket sits in the project plan: the group → milestone path, the switcher for
 * sibling tickets, and the one way out to the Plan tab.
 *
 * The group and milestone are deliberately not links — they are layers inside the Plan tab
 * rather than pages of their own, so navigating to them goes through "View in Plan".
 */
@Component({
  selector: 'app-ticket-location',
  imports: [ButtonModule, WorkItemJumpComponent],
  templateUrl: './ticket-location.component.html',
  styleUrl: './ticket-location.component.scss',
  providers: [WorkItemJumpState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketLocationComponent {
  readonly ticket = input.required<WorkTicketModel>();

  /** The tree above the switcher, repeated inside the panel so the list is visibly scoped. */
  readonly jumpContext = computed<WorkItemJumpContext[]>(() => [
    { icon: 'pi-folder', title: this.ticket().groupTitle },
    { icon: 'pi-flag', title: this.ticket().milestoneTitle },
  ]);

  readonly viewInPlan = output<void>();
  readonly jump = inject(WorkItemJumpState);
  private readonly api = inject(WorkTicketsService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const item = this.ticket();
      untracked(() =>
        this.jump.configure((search, cursor) =>
          this.api.getWorkTickets(item.workProjectId, {
            milestoneId: item.milestoneId,
            pageSize: 50,
            search,
            cursor,
          }),
        ),
      );
    });
  }

  selectSibling(id: string): void {
    void this.router.navigate(['/projects', this.ticket().workProjectId, 'tickets', id]);
  }
}
