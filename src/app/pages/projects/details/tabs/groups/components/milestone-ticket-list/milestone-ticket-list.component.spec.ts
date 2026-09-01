import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkTicketModel } from '../../../../../../../core/models/work-tickets';
import { MilestoneTicketListComponent } from './milestone-ticket-list.component';

describe('MilestoneTicketListComponent', () => {
  let fixture: ComponentFixture<MilestoneTicketListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestoneTicketListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MilestoneTicketListComponent);
    fixture.componentRef.setInput('milestoneTitle', 'Milestone');
    fixture.componentRef.setInput('page', null);
    fixture.detectChanges();
  });

  it('creates', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders assigned and unassigned tickets with the same metadata structure', () => {
    fixture.componentRef.setInput('canEditTickets', true);
    fixture.componentRef.setInput('page', {
      items: [ticket('assigned', 'Aykhan', 'Zeynalov'), ticket('unassigned')],
      nextCursor: null,
      hasMore: false,
      loading: false,
    });
    fixture.detectChanges();

    const metadata = fixture.nativeElement.querySelectorAll('.ticket-meta');
    const rows = fixture.nativeElement.querySelectorAll('.ticket-row');
    expect(metadata).toHaveLength(2);
    expect(metadata[0].children).toHaveLength(3);
    expect(metadata[1].children).toHaveLength(3);
    expect(rows[0].querySelector(':scope > .item-menu-button')).toBeTruthy();
    expect(rows[1].querySelector(':scope > .item-menu-button')).toBeTruthy();
    expect(metadata[0].querySelector('app-profile-avatar')).toBeTruthy();
    expect(metadata[1].querySelector('.ticket-assignee--unassigned .pi-user')).toBeTruthy();
  });
});

function ticket(id: string, name?: string, surname?: string): WorkTicketModel {
  return {
    id,
    code: id,
    title: `Ticket ${id}`,
    workProjectId: 'project',
    milestoneId: 'milestone',
    milestoneTitle: 'Milestone',
    groupId: 'group',
    groupTitle: 'Group',
    workTicketType: { id: 1, code: 'Feature', name: 'Feature' },
    workTicketStatus: { id: 1, code: 'New', name: 'New' },
    priority: { id: 1, code: 'Medium', name: 'Medium' },
    assignee: name && surname
      ? { id: 'participant', userId: 'user', name, surname, avatarPath: null }
      : null,
  };
}
