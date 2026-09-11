import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkItemTypeComponent } from './work-item-type.component';

describe('WorkItemTypeComponent', () => {
  let fixture: ComponentFixture<WorkItemTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkItemTypeComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WorkItemTypeComponent);
  });

  it('renders the semantic bug appearance', () => {
    fixture.componentRef.setInput('type', { id: 1, code: 'Bug', name: 'Bug' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.work-item-type--bug')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('.work-item-type__bug.work-item-type__icon'),
    ).toBeTruthy();
  });

  it('uses the common icon box for non-bug types', () => {
    fixture.componentRef.setInput('type', { id: 2, code: 'Feature', name: 'Feature' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.pi-star.work-item-type__icon')).toBeTruthy();
  });
});
