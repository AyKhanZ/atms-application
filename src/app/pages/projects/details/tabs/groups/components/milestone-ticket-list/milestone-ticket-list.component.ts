import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { WorkTicketModel } from '../../../../../../../core/models/work-tickets';
import { WorkItemAssigneeComponent } from '../../../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { TicketStatusBadgeComponent } from '../../../../../tickets/components/ticket-status-badge/ticket-status-badge.component';
import { WorkItemTypeComponent } from '../../../../../../../shared/components/work-item-type/work-item-type.component';
import { WorkItemRefComponent } from '../../../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemKind } from '../../../../../../../core/models/work-items';

export interface MilestoneTicketPageState {
  items: WorkTicketModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-milestone-ticket-list',
  imports: [
    WorkItemRefComponent,
    ButtonModule,
    MenuModule,
    WorkItemAssigneeComponent,
    TicketStatusBadgeComponent,
    WorkItemTypeComponent,
  ],
  templateUrl: './milestone-ticket-list.component.html',
  styleUrl: './milestone-ticket-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilestoneTicketListComponent {
  protected readonly kinds = WorkItemKind;
  readonly milestoneTitle = input.required<string>();
  readonly page = input<MilestoneTicketPageState | null>(null);
  readonly canEditTickets = input(false);
  readonly currentTicketId = input<string | null>(null);

  readonly viewTicket = output<string>();
  readonly editTicket = output<string>();
  readonly loadMore = output<void>();

  readonly selectedTicket = signal<WorkTicketModel | null>(null);
  readonly tickets = computed(() => this.page()?.items ?? []);

  readonly ticketActions = computed<MenuItem[]>(() => {
    const ticket = this.selectedTicket();
    if (!ticket || !this.canEditTickets()) return [];

    return [
      {
        label: 'Edit',
        icon: 'pi pi-pencil',
        command: () => this.editTicket.emit(ticket.id),
      },
    ];
  });

  openTicketMenu(event: Event, ticket: WorkTicketModel, menu: Menu): void {
    if (!this.canEditTickets()) return;
    this.selectedTicket.set(ticket);
    menu.toggle(event);
  }
}
