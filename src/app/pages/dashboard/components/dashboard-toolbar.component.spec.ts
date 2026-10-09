import { TestBed } from '@angular/core/testing';
import { translocoTestingProviders } from '../../../core/testing/transloco-testing';
import { DashboardPeriodOption } from '../../../core/utils/dashboard-query.utils';
import { DashboardToolbarComponent } from './dashboard-toolbar.component';

const periodOptions: DashboardPeriodOption[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range' },
];

describe('DashboardToolbarComponent', () => {
  function create() {
    TestBed.configureTestingModule({
      imports: [DashboardToolbarComponent],
      providers: [...translocoTestingProviders()],
    });
    const fixture = TestBed.createComponent(DashboardToolbarComponent);
    fixture.componentRef.setInput('projectOptions', [{ id: '', label: 'All projects' }]);
    fixture.componentRef.setInput('periodOptions', periodOptions);
    fixture.componentRef.setInput('period', '30d');
    fixture.detectChanges();
    return fixture;
  }

  it('hides the custom range and the refresh until a period is chosen and data exists', () => {
    const fixture = create();

    expect(fixture.nativeElement.querySelector('.dashboard-apply')).toBeNull();
    expect(fixture.nativeElement.querySelector('p-datepicker')).toBeNull();
    expect(fixture.nativeElement.querySelector('.dashboard-refresh')).toBeNull();
  });

  it('asks to apply a custom range and blocks Apply while the range is wrong', () => {
    const fixture = create();
    fixture.componentRef.setInput('period', 'custom');
    fixture.componentRef.setInput('customError', 'Pick both a start and an end date');
    fixture.detectChanges();

    const apply = fixture.nativeElement.querySelector('.dashboard-apply') as HTMLButtonElement;
    expect(fixture.nativeElement.querySelectorAll('p-datepicker').length).toBe(2);
    expect(apply.disabled).toBe(true);
    expect(apply.title).toBe('Pick both a start and an end date');

    const applied = vi.fn();
    fixture.componentInstance.apply.subscribe(applied);
    fixture.componentRef.setInput('customError', null);
    fixture.detectChanges();
    apply.click();

    expect(applied).toHaveBeenCalledOnce();
  });

  it('refreshes only while the page has data', () => {
    const fixture = create();
    const refreshed = vi.fn();
    fixture.componentInstance.refresh.subscribe(refreshed);
    fixture.componentRef.setInput('showUpdated', true);
    fixture.componentRef.setInput('updatedText', 'Updated just now');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '.dashboard-refresh__button',
    ) as HTMLButtonElement;
    expect(fixture.nativeElement.querySelector('.dashboard-refresh')?.textContent).toContain(
      'Updated just now',
    );
    button.click();

    expect(refreshed).toHaveBeenCalledOnce();
  });
});
