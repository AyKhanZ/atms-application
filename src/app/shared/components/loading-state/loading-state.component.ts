import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  template: `
    <div class="loading-state" role="status">
      <i class="pi pi-spin pi-spinner" aria-hidden="true"></i>
      <span>{{ text() }}</span>
    </div>
  `,
  styleUrl: './loading-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.compact]': 'compact()' },
})
export class LoadingStateComponent {
  readonly text = input('Loading...');
  // one line, for lists inside a card
  readonly compact = input(false, { transform: booleanAttribute });
}
