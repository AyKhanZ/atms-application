import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface EntityTab<TId extends string = string> {
  id: TId;
  label: string;
  // e.g. "pi-align-left"
  icon: string;
  badge?: string;
}

// each page owns its tab ids and routing, this only draws the strip
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
          @if (tab.badge; as badge) {
            <span class="entity-tab-badge">{{ badge }}</span>
          }
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
