import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

/** The outline of a file list while it loads, in place of a "Loading…" line. */
@Component({
  selector: 'app-attachment-list-skeleton',
  imports: [SkeletonModule],
  template: `
    <div class="skeleton-list" role="status" aria-label="Loading files">
      @for (row of rowList(); track row) {
        <div class="skeleton-row">
          <p-skeleton width="2.25rem" height="2.25rem" borderRadius="8px" />
          <div class="skeleton-text">
            <p-skeleton [width]="row % 2 ? '55%' : '38%'" height="0.85rem" />
            <p-skeleton width="22%" height="0.7rem" />
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .skeleton-list {
      display: grid;
      overflow: hidden;
      border: 1px solid var(--app-border);
      border-radius: var(--radius-card);
    }

    .skeleton-row {
      display: grid;
      grid-template-columns: 2.25rem minmax(0, 1fr);
      align-items: center;
      gap: 0.75rem;
      padding: 0.55rem 0.75rem;
    }

    .skeleton-row + .skeleton-row {
      border-top: 1px solid var(--app-border);
    }

    .skeleton-text {
      display: grid;
      gap: 0.4rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttachmentListSkeletonComponent {
  readonly rows = input(3);
  readonly rowList = computed(() => Array.from({ length: this.rows() }, (_, index) => index));
}
