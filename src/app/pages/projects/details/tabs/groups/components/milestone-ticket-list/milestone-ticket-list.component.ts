import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Menu, MenuModule } from 'primeng/menu';
import { ButtonModule } from 'primeng/button';
import { MenuItem } from 'primeng/api';
import { WorkTicketModel } from '../../../../../../../core/models/work-tickets';
import { ProfileAvatarComponent } from '../../../../../../../shared/components/profile-avatar/profile-avatar.component';
import { TicketStatusBadgeComponent } from '../../../../../tickets/components/ticket-status-badge/ticket-status-badge.component';
import { TicketTypeBadgeComponent } from '../../../../../tickets/components/ticket-type-badge/ticket-type-badge.component';

export interface MilestoneTicketPageState {
  items: WorkTicketModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-milestone-ticket-list',
  imports: [
    ButtonModule,
    MenuModule,
    ProfileAvatarComponent,
    TicketStatusBadgeComponent,
    TicketTypeBadgeComponent,
  ],
  templateUrl: './milestone-ticket-list.component.html',
  styleUrl: './milestone-ticket-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilestoneTicketListComponent {
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

  ticketCode(code: string): string {
    return `#${code}`;
  }

  assigneeName(ticket: WorkTicketModel): string {
    return ticket.assignee
      ? `${ticket.assignee.name} ${ticket.assignee.surname}`.trim()
      : 'Unassigned';
  }

  assigneeInitials(ticket: WorkTicketModel): string {
    const assignee = ticket.assignee;
    if (!assignee) return '';

    const initials = `${assignee.name?.[0] ?? ''}${assignee.surname?.[0] ?? ''}`;
    return initials.toUpperCase() || 'U';
  }
}
