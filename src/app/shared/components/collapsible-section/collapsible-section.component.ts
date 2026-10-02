import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

let nextSectionId = 0;

/**
 * A part of a page that folds, as in Azure DevOps: the title with a chevron at the far end and a
 * line under it; a click on the title hides or shows the content. History's status graph and list,
 * a task's description and discussion.
 *
 * The content stays alive while folded — a discussion keeps its comments and its live updates —
 * it is only taken off the page.
 */
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
  /** Two-way: the page keeps whether it is open, so it stays folded from one item to the next. */
  readonly open = model(true);

  protected readonly bodyId = `collapsible-section-${nextSectionId++}`;
}
