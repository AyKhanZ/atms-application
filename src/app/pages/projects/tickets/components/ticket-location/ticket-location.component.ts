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
import { WorkItemKind } from '../../../../../core/models/work-items';

// group and milestone arent links, they are layers inside Plan, so "View in Plan"
@Component({
  selector: 'app-ticket-location',
  imports: [ButtonModule, WorkItemJumpComponent],
  templateUrl: './ticket-location.component.html',
  styleUrl: './ticket-location.component.scss',
  providers: [WorkItemJumpState],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketLocationComponent {
  protected readonly kinds = WorkItemKind;
  readonly ticket = input.required<WorkTicketModel>();

  // repeated inside the panel so the list is visibly scoped
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
    // sibling replaces this page so Back goes where the user came from
    void this.router.navigate(['/projects', this.ticket().workProjectId, 'tickets', id], {
      state: { replaceHistory: true },
    });
  }
}
