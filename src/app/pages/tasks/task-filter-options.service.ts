import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { Observable, catchError, map, of } from 'rxjs';
import { DictionaryModel } from '../../core/models/dictionary.model';
import { WorkItemKind } from '../../core/models/work-items';
import { createDefaultWorkProjectListFilter } from '../../core/models/work-projects';
import { DictionaryService } from '../../core/services/dictionary.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import { WorkTicketsService } from '../../core/services/work-tickets.service';
import { TaskBoardStoreActions, TaskBoardStoreSelectors } from '../../store/task-board';
import { UserStoreSelectors } from '../../store/user';
import { FilterOption } from './components/task-filters/filter-option';
import { OptionsPage, RemoteOptions } from './remote-options';

/** The API caps a page at 50. */
const pageSize = 50;

const projectOption = (project: { id: string; code: string; title: string }): FilterOption => ({
  value: project.id,
  label: `#${project.code} ${project.title}`,
  ref: { kind: WorkItemKind.Project, code: project.code, title: project.title },
});

const ticketOption = (ticket: { id: string; code: string; title: string }): FilterOption => ({
  value: ticket.id,
  label: `#${ticket.code} ${ticket.title}`,
  ref: { kind: WorkItemKind.Ticket, code: ticket.code, title: ticket.title },
});

/**
 * What the Tasks page's filter dropdowns offer: statuses, priorities, people, and projects and the
 * tickets of the one chosen project — those two searched on the server and read a page at a time.
 * Provided by the page, so it lives and dies with it.
 */
@Injectable()
export class TaskFilterOptionsService {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dictionaries = inject(DictionaryService);
  private readonly projectsService = inject(WorkProjectsService);
  private readonly ticketsService = inject(WorkTicketsService);

  private readonly me = this.store.selectSignal(UserStoreSelectors.getMe);
  private readonly assignees = this.store.selectSignal(TaskBoardStoreSelectors.getAssignees);
  /** The project whose tickets the Ticket filter offers; null unless exactly one is chosen. */
  private ticketProjectId: string | null = null;

  readonly projects = new RemoteOptions(
    (term, next) => this.projectPage(term, next),
    (id) => this.projectsService.getProject(id).pipe(map(projectOption)),
    this.destroyRef,
  );
  readonly tickets = new RemoteOptions(
    (term, next) => this.ticketPage(term, next),
    (id) =>
      this.ticketProjectId
        ? this.ticketsService.getWorkTicket(this.ticketProjectId, id).pipe(map(ticketOption))
        : of(),
    this.destroyRef,
  );

  /** Task statuses in their dictionary order; the board builds its columns from them. */
  readonly statuses = signal<DictionaryModel[]>([]);
  readonly statusOptions = computed<FilterOption<number>[]>(() =>
    this.statuses().map((status) => ({ value: status.id, label: status.name })),
  );
  readonly priorityOptions = signal<FilterOption<number>[]>([]);
  readonly meOption = computed<FilterOption | null>(() => {
    const person = this.me();
    return person ? { value: person.id, label: 'Me', person } : null;
  });
  readonly peopleOptions = computed<FilterOption[]>(() => {
    const meId = this.me()?.id;
    return this.assignees()
      .filter((person) => person.id !== meId)
      .map((person) => ({ value: person.id, label: `${person.name} ${person.surname}`, person }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  constructor() {
    this.keep(this.dictionaries.getWorkTaskStatusDictionaries(), (statuses) =>
      this.statuses.set(statuses),
    );
    this.keep(this.dictionaries.getWorkItemPriorityDictionaries(), (priorities) =>
      this.priorityOptions.set(priorities.map((item) => ({ value: item.id, label: item.name }))),
    );
    this.projects.reload();
  }

  /** People and tickets depend on the projects chosen; the choices themselves must stay named. */
  select(projectIds: readonly string[], workTicketIds: readonly string[]): void {
    this.store.dispatch(TaskBoardStoreActions.loadAssignees({ projectIds: [...projectIds] }));
    this.projects.choose(projectIds);

    const ticketProjectId = projectIds.length === 1 ? projectIds[0] : null;
    if (ticketProjectId !== this.ticketProjectId) {
      this.ticketProjectId = ticketProjectId;
      this.tickets.clear();
      if (ticketProjectId) this.tickets.reload();
    }
    this.tickets.choose(ticketProjectId ? workTicketIds : []);
  }

  /** A dropdown without its options still works: a failed load leaves it empty, not broken. */
  private keep<T>(source: Observable<T[]>, set: (value: T[]) => void): void {
    source
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(set);
  }

  private projectPage(term: string, next: string | null): Observable<OptionsPage> {
    return this.projectsService
      .getProjects({
        ...createDefaultWorkProjectListFilter(),
        page: next ? Number(next) : 1,
        pageSize,
        search: term || undefined,
      })
      .pipe(
        map((response) => ({
          options: response.items.map(projectOption),
          next: response.hasNext ? String(response.page + 1) : null,
        })),
      );
  }

  private ticketPage(term: string, next: string | null): Observable<OptionsPage> {
    if (!this.ticketProjectId) return of({ options: [], next: null });
    return this.ticketsService
      .getWorkTickets(this.ticketProjectId, { pageSize, search: term, cursor: next })
      .pipe(
        map((response) => ({
          options: response.items.map(ticketOption),
          next: response.hasMore ? response.nextCursor : null,
        })),
      );
  }
}
