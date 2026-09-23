import { Observable, EMPTY, expand, map, reduce } from 'rxjs';
import { WorkProjectItemModel } from '../../core/models/work-projects';
import { WorkTicketModel } from '../../core/models/work-tickets';
import { WorkItemKind } from '../../core/models/work-items';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import { WorkTicketsService } from '../../core/services/work-tickets.service';
import { createDefaultWorkProjectListFilter } from '../../core/models/work-projects';
import { FilterOption } from './components/task-filters/task-filters.component';

/** The API caps a page at 50; the filter needs every project and ticket, so it follows the pages. */
const pageSize = 50;

/** Every project the user can see, as filter options. */
export function allProjectOptions(projects: WorkProjectsService): Observable<FilterOption[]> {
  const page = (number: number) =>
    projects.getProjects({ ...createDefaultWorkProjectListFilter(), page: number, pageSize });

  return page(1).pipe(
    expand((response) => (response.hasNext ? page(response.page + 1) : EMPTY)),
    reduce((items: WorkProjectItemModel[], response) => [...items, ...response.items], []),
    map((items) =>
      items.map((project) => ({
        value: project.id,
        label: `#${project.code} ${project.title}`,
        ref: { kind: WorkItemKind.Project, code: project.code, title: project.title },
      })),
    ),
  );
}

/** Every ticket of one project, as filter options. */
export function allTicketOptions(
  tickets: WorkTicketsService,
  projectId: string,
): Observable<FilterOption[]> {
  const page = (cursor: string | null) => tickets.getWorkTickets(projectId, { pageSize, cursor });

  return page(null).pipe(
    expand((response) =>
      response.hasMore && response.nextCursor ? page(response.nextCursor) : EMPTY,
    ),
    reduce((items: WorkTicketModel[], response) => [...items, ...response.items], []),
    map((items) =>
      items.map((ticket) => ({
        value: ticket.id,
        label: `#${ticket.code} ${ticket.title}`,
        ref: { kind: WorkItemKind.Ticket, code: ticket.code, title: ticket.title },
      })),
    ),
  );
}
