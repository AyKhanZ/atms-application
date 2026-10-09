import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { WorkItemKind } from '../../../core/models/work-items';
import { workItemKindLabelKey, workItemKinds } from './work-item-kinds';

// tables keep the bare code
@Component({
  selector: 'app-work-item-ref',
  host: {
    '[attr.data-kind]': 'kind().tone',
    '[class.muted]': 'muted()',
  },
  template: `<i class="pi" [class]="'pi ' + kind().icon" aria-hidden="true"></i>
    @if (labelled() || showCode()) {
      <span *transloco="let t">
        @if (labelled()) {
          {{ t(labelKey()) }}
        }
        @if (showCode()) {
          #{{ code() }}
        }
      </span>
    }`,
  styleUrl: './work-item-ref.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
})
export class WorkItemRefComponent {
  readonly type = input.required<WorkItemKind>();
  readonly code = input.required<number | string>();
  // off in a tree of one kind, the same word on every row only takes width
  readonly labelled = input(true);
  readonly showCode = input(true);
  // replaced item, like an old parent in history
  readonly muted = input(false);

  readonly kind = computed(() => workItemKinds[this.type()]);
  readonly labelKey = computed(() => workItemKindLabelKey(this.type()));
}
