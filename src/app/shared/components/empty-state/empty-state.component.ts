import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <section class="empty-state">
      <div class="empty-state__icon">
        <i class="pi" [class]="'pi ' + icon()" aria-hidden="true"></i>
      </div>
      <h3>{{ title() }}</h3>
      @if (description(); as text) {
        <p>{{ text }}</p>
      }
      <ng-content />
    </section>
  `,
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  // e.g. "pi-paperclip"
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
