import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';

export type TaskStatusTone = 'neutral' | 'active' | 'success';

@Component({
  selector: 'app-task-status-badge',
  template: `
    <span
      class="task-status"
      [class.task-status--prominent]="prominent()"
      [class.task-status--muted]="muted()"
      [attr.data-tone]="tone()"
      [attr.aria-label]="dotOnly() ? status().name : null"
    >
      @if (!dotOnly()) {
        {{ status().name }}
      }
    </span>
  `,
  styleUrl: './task-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskStatusBadgeComponent {
  readonly status = input.required<DictionaryModel>();
  /** Page-header size, matching the status badge on Ticket and Project details. */
  readonly prominent = input(false);
  /** Only the dot: for a mark whose status is named elsewhere. */
  readonly dotOnly = input(false);
  /** A status that was replaced: grey and struck through. */
  readonly muted = input(false);
  readonly tone = computed(() => taskStatusTone(this.status().code));
}

/**
 * Tasks use their own three-value status scale (New, InProgress, Done), so they cannot reuse the
 * ticket tone map: it has no Done and would render a finished task in the neutral grey of New.
 */
export function taskStatusTone(code: string): TaskStatusTone {
  switch (code.trim().toLowerCase()) {
    case 'inprogress':
      return 'active';
    case 'done':
      return 'success';
    default:
      return 'neutral';
  }
}
