import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, expand, reduce } from 'rxjs';
import { WorkTicketModel, WorkTicketPageModel } from '../../../../../core/models/work-tickets';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import { TicketStatusBadgeComponent } from '../ticket-status-badge/ticket-status-badge.component';
import { TicketTypeBadgeComponent } from '../ticket-type-badge/ticket-type-badge.component';

@Component({
  selector: 'app-ticket-milestone-jump',
  imports: [TicketStatusBadgeComponent, TicketTypeBadgeComponent],
  templateUrl: './ticket-milestone-jump.component.html',
  styleUrl: './ticket-milestone-jump.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TicketMilestoneJumpComponent implements OnInit {
  private static readonly MAX_PAGE_SIZE = 50;

  private readonly router = inject(Router);
  private readonly workTicketsService = inject(WorkTicketsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly projectId = input.required<string>();
  readonly groupTitle = input.required<string>();
  readonly milestoneTitle = input.required<string>();
  readonly milestoneId = input.required<string>();
  readonly currentTicket = input.required<WorkTicketModel>();

  readonly open = signal(false);
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly searchTerm = signal('');
  readonly allTickets = signal<WorkTicketModel[]>([]);
  readonly visible = computed(
    () => this.loading() || this.loadError() || this.allTickets().length > 1,
  );
  readonly filteredTickets = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.allTickets();

    return this.allTickets().filter(
      (ticket) =>
        ticket.code.toLowerCase().includes(term) || ticket.title.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.load();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  close(): void {
    this.open.set(false);
    this.searchTerm.set('');
  }

  toggle(): void {
    this.open() ? this.close() : this.open.set(true);
  }

  viewTicket(ticketId: string): void {
    this.close();
    if (ticketId === this.currentTicket().id) return;
    void this.router.navigate(['/projects', this.projectId(), 'tickets', ticketId]);
  }

  updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.workTicketsService
      .getWorkTickets(this.projectId(), {
        milestoneId: this.milestoneId(),
        pageSize: TicketMilestoneJumpComponent.MAX_PAGE_SIZE,
      })
      .pipe(
        expand((page) =>
          page.hasMore && page.nextCursor
            ? this.workTicketsService.getWorkTickets(this.projectId(), {
                milestoneId: this.milestoneId(),
                pageSize: TicketMilestoneJumpComponent.MAX_PAGE_SIZE,
                cursor: page.nextCursor,
              })
            : EMPTY,
        ),
        reduce<WorkTicketPageModel, WorkTicketModel[]>(
          (tickets, page) => [...tickets, ...page.items],
          [],
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (tickets) => {
          this.allTickets.set(sortTicketsByCode(tickets));
          this.loading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.loading.set(false);
        },
      });
  }
}

export function sortTicketsByCode(tickets: WorkTicketModel[]): WorkTicketModel[] {
  return [...tickets].sort((left, right) => {
    const leftCode = Number(left.code);
    const rightCode = Number(right.code);
    if (Number.isFinite(leftCode) && Number.isFinite(rightCode)) return rightCode - leftCode;
    return right.code.localeCompare(left.code, undefined, { numeric: true });
  });
}
