import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { WorkItemKind } from '../../../core/models/work-items';
import { workItemKinds } from './work-item-kinds';

/**
 * "TASK #34" with the kind's icon in front, in the kind's colour — the header of a details page,
 * search rows, lists and trees. Tables keep the bare code.
 */
@Component({
  selector: 'app-work-item-ref',
  host: {
    '[attr.data-kind]': 'kind().tone',
    '[class.muted]': 'muted()',
  },
  template: `<i class="pi" [class]="'pi ' + kind().icon" aria-hidden="true"></i>
    @if (labelled() || showCode()) {
      <span>
        @if (labelled()) {
          {{ kind().label }}
        }
        @if (showCode()) {
          #{{ code() }}
        }
      </span>
    }`,
  styleUrl: './work-item-ref.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemRefComponent {
  readonly type = input.required<WorkItemKind>();
  readonly code = input.required<number | string>();
  /**
   * Off in a tree of one kind — the switcher, the parent select — where the same word on every row
   * would only take width. Icon, colour and type of the code stay, so the row still looks alike.
   */
  readonly labelled = input(true);
  readonly showCode = input(true);
  /** A work item that was replaced, as the history shows an old parent or ticket. */
  readonly muted = input(false);

  readonly kind = computed(() => workItemKinds[this.type()]);
}
