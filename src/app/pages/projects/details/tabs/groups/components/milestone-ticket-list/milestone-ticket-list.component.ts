import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import { currentLanguage } from '../../../../../../../core/i18n/active-language';
import { LoadMoreButtonComponent } from '../../../../../../../shared/components/load-more-button/load-more-button.component';
import { WorkTicketModel } from '../../../../../../../core/models/work-tickets';
import { WorkItemAssigneeComponent } from '../../../../../../../shared/components/work-item-assignee/work-item-assignee.component';
import { TicketStatusBadgeComponent } from '../../../../../tickets/components/ticket-status-badge/ticket-status-badge.component';
import { WorkItemTypeComponent } from '../../../../../../../shared/components/work-item-type/work-item-type.component';
import { WorkItemRefComponent } from '../../../../../../../shared/components/work-item-ref/work-item-ref.component';
import { WorkItemKind } from '../../../../../../../core/models/work-items';
import { LoadingStateComponent } from '../../../../../../../shared/components/loading-state/loading-state.component';

export interface MilestoneTicketPageState {
  items: WorkTicketModel[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
}

@Component({
  selector: 'app-milestone-ticket-list',
  imports: [
    LoadingStateComponent,
    WorkItemRefComponent,
    LoadMoreButtonComponent,
    MenuModule,
    WorkItemAssigneeComponent,
    TicketStatusBadgeComponent,
    WorkItemTypeComponent,
    TranslocoDirective,
  ],
  templateUrl: './milestone-ticket-list.component.html',
  styleUrl: './milestone-ticket-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilestoneTicketListComponent {
  private readonly transloco = inject(TranslocoService);
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
    currentLanguage();
    const ticket = this.selectedTicket();
    if (!ticket || !this.canEditTickets()) return [];

    return [
      {
        label: this.transloco.translate('common.edit'),
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
