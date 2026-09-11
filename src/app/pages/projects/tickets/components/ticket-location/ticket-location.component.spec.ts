import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';
import { TicketLocationComponent } from './ticket-location.component';

describe('TicketLocationComponent', () => {
  it('requests one page within its milestone and navigates to a sibling', async () => {
    const getWorkTickets = vi.fn(() => of({ items: [], hasMore: true, nextCursor: 'next' }));
    await TestBed.configureTestingModule({
      imports: [TicketLocationComponent],
      providers: [provideRouter([]), { provide: WorkTicketsService, useValue: { getWorkTickets } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TicketLocationComponent);
    fixture.componentRef.setInput('ticket', {
      id: 'current',
      code: '1',
      title: 'Ticket',
      workProjectId: 'project',
      groupTitle: 'Group',
      milestoneId: 'milestone',
      milestoneTitle: 'Milestone',
    });
    fixture.detectChanges();
    expect(getWorkTickets).toHaveBeenCalledExactlyOnceWith('project', {
      milestoneId: 'milestone',
      pageSize: 50,
      search: '',
      cursor: undefined,
    });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.selectSibling('sibling');
    expect(navigate).toHaveBeenCalledWith(['/projects', 'project', 'tickets', 'sibling']);
  });
});
