import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TicketTypeBadgeComponent } from './ticket-type-badge.component';

describe('TicketTypeBadgeComponent', () => {
  let fixture: ComponentFixture<TicketTypeBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TicketTypeBadgeComponent] }).compileComponents();
    fixture = TestBed.createComponent(TicketTypeBadgeComponent);
  });

  it('renders the semantic bug appearance', () => {
    fixture.componentRef.setInput('type', { id: 1, code: 'Bug', name: 'Bug' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.ticket-type--bug')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.ticket-type__bug.ticket-type__icon')).toBeTruthy();
  });

  it('uses the common icon box for non-bug types', () => {
    fixture.componentRef.setInput('type', { id: 2, code: 'Feature', name: 'Feature' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-star.ticket-type__icon')).toBeTruthy();
  });
});
