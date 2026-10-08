import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextSectionId = 0;

// content stays alive while folded (discussion keeps comments and live updates)
@Component({
  selector: 'app-collapsible-section',
  template: `
    <h3 class="collapsible__head">
      <button
        type="button"
        [attr.aria-controls]="bodyId"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <span>{{ title() }}</span>
        <i
          class="pi"
          [class.pi-chevron-down]="open()"
          [class.pi-chevron-right]="!open()"
          aria-hidden="true"
        ></i>
      </button>
    </h3>
    @if (open()) {
      <div class="collapsible__body" [id]="bodyId">
        <ng-content />
      </div>
    }
  `,
  styleUrl: './collapsible-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollapsibleSectionComponent {
  readonly title = input.required<string>();
  // two-way so it stays folded from one item to the next
  readonly open = model(true);

  protected readonly bodyId = `collapsible-section-${nextSectionId++}`;
}
