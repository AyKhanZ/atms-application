import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../../../../../core/models/dictionary.model';

export type WorkGroupStatusTone = 'planned' | 'active' | 'done' | 'unknown';

@Component({
  selector: 'app-work-group-status-badge',
  templateUrl: './work-group-status-badge.component.html',
  styleUrl: './work-group-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkGroupStatusBadgeComponent {
  readonly status = input.required<DictionaryModel>();
  readonly tone = computed(() => workGroupStatusTone(this.status().code));
}

export function workGroupStatusTone(code: string): WorkGroupStatusTone {
  switch (code.trim().toLowerCase()) {
    case 'planned':
      return 'planned';
    case 'active':
      return 'active';
    case 'done':
      return 'done';
    default:
      return 'unknown';
  }
}
