import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';

@Component({
  selector: 'app-ticket-type-badge',
  template: `
    <span
      class="ticket-type"
      [class.ticket-type--bug]="appearance() === 'bug'"
      [class.ticket-type--feature]="appearance() === 'feature'"
      [class.ticket-type--project]="appearance() === 'project'"
      [class.ticket-type--default]="appearance() === 'default'"
    >
      @if (appearance() === 'bug') {
        <svg class="ticket-type__icon ticket-type__bug" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 5.25h6v5.5a3 3 0 0 1-6 0v-5.5Z" />
          <path d="M6.4 5.25V4.4a1.6 1.6 0 0 1 3.2 0v.85" />
          <path d="M2 7h3m6 0h3M2 10h3m6 0h3" />
          <path d="M3.25 3.25 5.4 4.8m7.35-1.55L10.6 4.8M8 5.4v8.35" />
        </svg>
      } @else {
        <i class="pi ticket-type__icon" [class]="'pi ticket-type__icon ' + icon()" aria-hidden="true"></i>
      }
      <span>{{ type().name }}</span>
    </span>
  `,
  styleUrl: './ticket-type-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketTypeBadgeComponent {
  readonly type = input.required<DictionaryModel>();
  readonly appearance = computed(() => normalizeCode(this.type().code));
  readonly icon = computed(() => {
    switch (this.appearance()) {
      case 'feature':
        return 'pi-star';
      case 'project':
        return 'pi-folder';
      default:
        return 'pi-ticket';
    }
  });
}

function normalizeCode(code: string): string {
  const normalized = code.trim().toLowerCase();
  return ['bug', 'feature', 'project'].includes(normalized) ? normalized : 'default';
}
