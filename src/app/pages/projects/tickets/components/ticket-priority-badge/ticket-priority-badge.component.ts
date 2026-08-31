import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';

export type TicketPriorityTone = 'low' | 'medium' | 'high' | 'critical';

@Component({
  selector: 'app-ticket-priority-badge',
  template: `
    <span class="ticket-priority" [attr.data-tone]="tone()">{{ priority().name }}</span>
  `,
  styleUrl: './ticket-priority-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketPriorityBadgeComponent {
  readonly priority = input.required<DictionaryModel>();
  readonly tone = computed(() => ticketPriorityTone(this.priority().code));
}

export function ticketPriorityTone(code: string): TicketPriorityTone {
  const normalized = code.trim().toLowerCase();
  if (['critical', 'urgent', 'blocker'].includes(normalized)) return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
}
