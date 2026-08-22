import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../../core/models/dictionary.model';

export type ProjectStatusTone = 'draft' | 'active' | 'review' | 'closed' | 'unknown';

@Component({
  selector: 'app-project-status-badge',
  templateUrl: './project-status-badge.component.html',
  styleUrl: './project-status-badge.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectStatusBadgeComponent {
  readonly status = input.required<DictionaryModel>();
  readonly prominent = input(false);
  readonly tone = computed(() => projectStatusTone(this.status().code));
}

export function projectStatusTone(code: string): ProjectStatusTone {
  switch (code.trim().toLowerCase()) {
    case 'draft':
      return 'draft';
    case 'active':
      return 'active';
    case 'onreview':
      return 'review';
    case 'closed':
      return 'closed';
    default:
      return 'unknown';
  }
}
