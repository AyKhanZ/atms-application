import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  TicketPriorityBadgeComponent,
  ticketPriorityTone,
} from './ticket-priority-badge.component';

describe('TicketPriorityBadgeComponent', () => {
  let fixture: ComponentFixture<TicketPriorityBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TicketPriorityBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(TicketPriorityBadgeComponent);
  });

  it('renders priority with a neutral compact appearance', () => {
    fixture.componentRef.setInput('priority', { id: 1, code: 'High', name: 'High' });
    fixture.detectChanges();

    const priority = fixture.nativeElement.querySelector('.ticket-priority');
    expect(priority).toBeTruthy();
    expect(priority.textContent).toContain('High');
    expect(priority.querySelector('.ticket-priority__dot')).toBeNull();
  });

  it.each([
    ['Low', 'low'],
    ['Medium', 'medium'],
    ['High', 'high'],
    ['Critical', 'critical'],
    ['Unknown', 'low'],
  ] as const)('maps %s to the %s tone', (code, tone) => {
    expect(ticketPriorityTone(code)).toBe(tone);
  });
});
