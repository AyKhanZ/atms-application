import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DictionaryModel } from '../../../core/models/dictionary.model';

export type WorkItemPriorityTone = 'low' | 'medium' | 'high' | 'critical';

// a meter not a chip, priority is a scale and status is categories
// arrows were tried and dropped, nobody could rank ⇊ vs ↓
@Component({
  selector: 'app-work-item-priority',
  template: `
    <span
      class="work-item-priority"
      [class.work-item-priority--muted]="muted()"
      [attr.data-tone]="tone()"
      [attr.aria-label]="ariaLabel()"
    >
      <span class="work-item-priority__meter" aria-hidden="true">
        @for (step of steps; track step) {
          <span class="work-item-priority__bar" [class.is-filled]="step <= level()"></span>
        }
      </span>
      <span class="work-item-priority__label">{{ priority().name }}</span>
    </span>
  `,
  styleUrl: './work-item-priority.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemPriorityComponent {
  readonly priority = input.required<DictionaryModel>();
  // replaced: grey and struck through
  readonly muted = input(false);

  protected readonly steps = [1, 2, 3] as const;
  readonly tone = computed(() => workItemPriorityTone(this.priority().code));
  readonly level = computed(() => priorityLevel(this.tone()));
  protected readonly ariaLabel = computed(
    () => `Priority: ${this.priority().name}, ${this.level()} of ${this.steps.length}`,
  );
}

export function workItemPriorityTone(code: string): WorkItemPriorityTone {
  const normalized = code.trim().toLowerCase();
  if (['critical', 'urgent', 'blocker'].includes(normalized)) return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';

  return 'low';
}

export function priorityLevel(tone: WorkItemPriorityTone): number {
  switch (tone) {
    case 'critical':
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}
