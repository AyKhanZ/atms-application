import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { DictionaryService } from '../../core/services/dictionary.service';
import { WorkProjectsService } from '../../core/services/work-projects.service';
import { WorkTicketsService } from '../../core/services/work-tickets.service';
import { TaskBoardStoreActions, TaskBoardStoreSelectors } from '../../store/task-board';
import { UserStoreSelectors } from '../../store/user';
import { TaskFilterOptionsService } from './task-filter-options.service';

describe('TaskFilterOptionsService', () => {
  function setup() {
    const dispatch = vi.fn();
    const getWorkTickets = vi.fn(() =>
      of({ items: [{ id: 't1', code: '28', title: 'Payments' }], hasMore: false, nextCursor: null }),
    );
    TestBed.configureTestingModule({
      providers: [
        TaskFilterOptionsService,
        {
          provide: Store,
          useValue: {
            dispatch,
            selectSignal: (selector: unknown) =>
              selector === UserStoreSelectors.getMe
                ? signal({ id: 'me', name: 'Aykhan', surname: 'Z' })
                : selector === TaskBoardStoreSelectors.getAssignees
                  ? signal([
                      { id: 'me', name: 'Aykhan', surname: 'Z' },
                      { id: 'p2', name: 'Rustam', surname: 'Agaev' },
                    ])
                  : signal(null),
          },
        },
        {
          provide: DictionaryService,
          useValue: {
            getWorkTaskStatusDictionaries: () => of([{ id: 1, code: 'New', name: 'New' }]),
            getWorkItemPriorityDictionaries: () => of([{ id: 3, code: 'High', name: 'High' }]),
          },
        },
        {
          provide: WorkProjectsService,
          useValue: {
            getProjects: () =>
              of({ items: [{ id: 'p', code: '7', title: 'Gateway' }], page: 1, hasNext: false }),
            getProject: (id: string) => of({ id, code: '8', title: 'Other' }),
          },
        },
        { provide: WorkTicketsService, useValue: { getWorkTickets } },
      ],
    });
    return { service: TestBed.inject(TaskFilterOptionsService), dispatch, getWorkTickets };
  }

  it('offers statuses, priorities and the first page of projects, and everyone but me as people', () => {
    const { service } = setup();

    expect(service.statusOptions()).toEqual([{ value: 1, label: 'New' }]);
    expect(service.priorityOptions()).toEqual([{ value: 3, label: 'High' }]);
    expect(service.projects.options().map((option) => option.label)).toEqual(['#7 Gateway']);
    expect(service.meOption()?.label).toBe('Me');
    expect(service.peopleOptions().map((option) => option.value)).toEqual(['p2']);
  });

  it('reads tickets only for one chosen project, and people for any choice', () => {
    const { service, dispatch, getWorkTickets } = setup();

    service.select(['p', 'q'], []);
    expect(service.tickets.options()).toEqual([]);
    expect(getWorkTickets).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenLastCalledWith(
      TaskBoardStoreActions.loadAssignees({ projectIds: ['p', 'q'] }),
    );

    service.select(['p'], []);
    expect(service.tickets.options().map((option) => option.label)).toEqual(['#28 Payments']);
  });

  it('keeps a chosen project named even when it is not on the first page', () => {
    const { service } = setup();

    service.select(['q'], []);

    expect(service.projects.options().map((option) => option.label)).toEqual([
      '#8 Other',
      '#7 Gateway',
    ]);
  });
});
