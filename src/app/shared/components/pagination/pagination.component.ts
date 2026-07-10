import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonModule, SelectModule, TooltipModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalCount = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageSizeOptions = input<number[]>([10, 20, 50]);

  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  readonly jumpPage = signal<number>(1);

  readonly rangeLabel = computed(() => {
    const from = (this.page() - 1) * this.pageSize() + 1;
    const to = Math.min(this.page() * this.pageSize(), this.totalCount());
    return `${from}–${to} of ${this.totalCount()}`;
  });

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.jumpPage.set(page);
    this.pageChange.emit(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(size);
  }

  onJump(): void {
    const p = Math.max(1, Math.min(this.jumpPage() ?? 1, this.totalPages()));
    this.changePage(p);
  }
}
