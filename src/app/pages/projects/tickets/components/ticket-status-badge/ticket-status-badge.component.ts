import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';

export type TicketStatusTone = 'neutral' | 'active' | 'review' | 'testing' | 'success' | 'danger';

@Component({
  selector: 'app-ticket-status-badge',
  template: `
    <span
      class="ticket-status"
      [class.ticket-status--prominent]="prominent()"
      [attr.data-tone]="tone()"
      >{{ status().name }}</span
    >
  `,
  styleUrl: './ticket-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketStatusBadgeComponent {
  readonly status = input.required<DictionaryModel>();
  /** Page-header size, matching the project status badge on Project details. */
  readonly prominent = input(false);
  readonly tone = computed(() => ticketStatusTone(this.status().code));
}

export function ticketStatusTone(code: string): TicketStatusTone {
  switch (code.trim().toLowerCase()) {
    case 'inprogress':
      return 'active';
    case 'inreview':
      return 'review';
    case 'testing':
      return 'testing';
    case 'closed':
      return 'success';
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}
