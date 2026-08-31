import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The "nothing here yet" panel shown by a tab that has no content.
 *
 * Previously this markup was pasted into every tab that needed it (six copies across Project
 * details, Ticket details and the Plan tab), with the styles living in the global stylesheet
 * so no component declared its dependency on them.
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <section class="empty-state" [class.empty-state--compact]="compact()">
      <div class="empty-state__icon">
        <i class="pi" [class]="'pi ' + icon()" aria-hidden="true"></i>
      </div>
      <h3>{{ title() }}</h3>
      @if (description(); as text) {
        <p>{{ text }}</p>
      }
    </section>
  `,
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  /** PrimeIcons class name, e.g. "pi-paperclip". */
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
  /** Shorter panel, for tabs nested inside an already-tall card. */
  readonly compact = input(false);
}
