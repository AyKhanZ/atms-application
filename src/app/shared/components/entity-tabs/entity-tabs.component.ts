import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface EntityTab<TId extends string = string> {
  id: TId;
  label: string;
  /** PrimeIcons class name, e.g. "pi-align-left". */
  icon: string;
}

/**
 * The tab strip across the top of a detail card.
 *
 * Project details and Ticket details had byte-identical markup and styles for this, differing
 * only in which tabs they listed. Each page still owns its own tab ids and routing — this
 * component only renders the strip and reports which tab was picked.
 */
@Component({
  selector: 'app-entity-tabs',
  template: `
    <nav class="entity-tabs" [attr.aria-label]="ariaLabel()">
      @for (tab of tabs(); track tab.id) {
        <button
          type="button"
          [class.active]="tab.id === active()"
          [attr.aria-current]="tab.id === active() ? 'page' : null"
          (click)="select.emit(tab.id)"
        >
          <i class="pi" [class]="'pi ' + tab.icon" aria-hidden="true"></i>
          <span>{{ tab.label }}</span>
        </button>
      }
    </nav>
  `,
  styleUrl: './entity-tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityTabsComponent<TId extends string = string> {
  readonly tabs = input.required<readonly EntityTab<TId>[]>();
  readonly active = input.required<TId>();
  readonly ariaLabel = input('Sections');

  readonly select = output<TId>();
}
