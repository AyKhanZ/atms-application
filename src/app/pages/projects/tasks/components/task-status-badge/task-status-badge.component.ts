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
  // same size as ticket and project header badges
  readonly prominent = input(false);
  // when the status is named elsewhere
  readonly dotOnly = input(false);
  // replaced status: grey and struck through
  readonly muted = input(false);
  readonly tone = computed(() => taskStatusTone(this.status().code));
}

// task statuses have Done, ticket tone map doesnt and would show it grey
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
