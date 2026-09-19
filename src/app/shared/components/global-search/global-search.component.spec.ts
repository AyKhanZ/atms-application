import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { projectApiUrl } from '../../../core/constants/api-url.constants';
import { Features } from '../../../store/features.enum';
import { GlobalSearchEffects } from '../../../store/global-search/global-search.effects';
import { globalSearchReducer } from '../../../store/global-search/global-search.reducer';
import { GlobalSearchComponent } from './global-search.component';
import { WorkItemKind } from '../../../core/models/work-items';

const empty = {
  projects: { items: [], hasMore: false },
  tickets: { items: [], hasMore: false },
  tasks: { items: [], hasMore: false },
  subtasks: { items: [], hasMore: false },
  recent: [],
};

describe('GlobalSearchComponent', () => {
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let component: GlobalSearchComponent;
  let http: HttpTestingController;

  // The test DOM has no layout: scrolling the lit row into view is stubbed, and put back after.
  const scrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideStore({ [Features.GlobalSearch]: globalSearchReducer }),
        provideEffects(GlobalSearchEffects),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  /* Opening the box must not sit through the typing delay: the recent list is the first thing
     the reader sees, and waiting for it reads as a slow search. */
  it('asks for recent items as soon as it opens', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);

    const request = http.expectOne(`${projectApiUrl}/search`);
    expect(request.request.params.keys()).toHaveLength(0);
    request.flush(empty);
  });

  it('explains what can be searched and the minimum title length', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input')?.getAttribute('placeholder')).toBe(
      'Search by code or title',
    );
    expect(element.querySelector('.message strong')?.textContent?.trim()).toBe(
      'Find projects, tickets, tasks and subtasks',
    );
    expect(element.querySelector('.message p')?.textContent?.trim()).toBe(
      'Enter a code or at least 3 letters from a title.',
    );
  });

  it('asks nothing while the query is too short to search', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);

    component.changeQuery('п');
    component.changeQuery('пл');
    await vi.advanceTimersByTimeAsync(600);

    http.expectNone(() => true);
  });

  it('asks once after a pause, for the last thing typed', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);

    component.changeQuery('пла');
    component.changeQuery('плат');
    component.changeQuery('платеж');
    // Comfortably inside the pause: with fake timers that also follow real time, a margin of
    // one millisecond would make this test fail on a slow machine rather than on a real fault.
    await vi.advanceTimersByTimeAsync(150);
    http.expectNone(() => true);

    await vi.advanceTimersByTimeAsync(300);
    const request = http.expectOne((value) => value.params.get('q') === 'платеж');
    request.flush(empty);
  });

  // A code is matched exactly on the server, so a single digit is already worth asking about.
  it('asks for a one digit code without waiting for more letters', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);

    component.changeQuery('7');
    await vi.advanceTimersByTimeAsync(301);

    http.expectOne((value) => value.params.get('q') === '7').flush(empty);
  });

  it('goes back to recent items when the field is cleared', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);

    component.changeQuery('платеж');
    await vi.advanceTimersByTimeAsync(301);
    http.expectOne((value) => value.params.get('q') === 'платеж').flush(empty);

    component.changeQuery('');
    await vi.advanceTimersByTimeAsync(1);

    http.expectOne((value) => value.params.keys().length === 0).flush(empty);
  });

  it('says so when the search is unavailable', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);

    component.changeQuery('платеж');
    await vi.advanceTimersByTimeAsync(301);
    http
      .expectOne((value) => value.params.get('q') === 'платеж')
      .error(new ProgressEvent('failed'));

    expect(component.failed()).toBe(true);
    expect(component.loading()).toBe(false);
  });

  it('opens the same input without discarding the character that opened it', async () => {
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input');
    expect(input).not.toBeNull();
    input?.dispatchEvent(new FocusEvent('focus'));
    if (input) input.value = '7';
    input?.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(element.querySelector('input')).toBe(input);
    expect(component.open()).toBe(true);
    expect(component.query()).toBe('7');
    expect(element.querySelector('.search-dropdown')).not.toBeNull();
    expect(element.querySelector('[aria-label="Close search"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(301);
    http.expectOne((value) => value.params.get('q') === '7').flush(empty);
  });

  it('cancels an outstanding search immediately when the query becomes too short', async () => {
    component.show();
    component.changeQuery('payment');
    await vi.advanceTimersByTimeAsync(301);
    const request = http.expectOne((value) => value.params.get('q') === 'payment');

    component.changeQuery('pa');

    expect(request.cancelled).toBe(true);
    expect(component.loading()).toBe(false);
    expect(component.selectable()).toEqual([]);
  });

  it('cancels a request on close and fetches recent items again on reopen', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    const request = http.expectOne(`${projectApiUrl}/search`);

    component.close(false);
    expect(request.cancelled).toBe(true);
    expect(component.open()).toBe(false);

    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);
    expect(component.open()).toBe(true);
  });

  it('uses one back action in the mobile full-screen search', async () => {
    component.isMobile.set(true);
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const close = element.querySelector<HTMLButtonElement>('[aria-label="Close search"]');
    expect(close).not.toBeNull();
    expect(close?.querySelector('.pi-arrow-left')).not.toBeNull();
    expect(element.querySelector('[role="dialog"]')).not.toBeNull();

    close?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.open()).toBe(false);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(element.querySelector('input')).not.toBeNull();
  });

  it('closes the desktop dropdown when the user clicks outside', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush(empty);

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    fixture.detectChanges();

    expect(component.open()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('.search-dropdown')).toBeNull();
  });

  it('reopens when typing into the input after closing', async () => {
    component.show();
    component.close(false);
    component.changeQuery('7');

    expect(component.open()).toBe(true);
    expect(component.query()).toBe('7');
    await vi.advanceTimersByTimeAsync(301);
    http.expectOne((value) => value.params.get('q') === '7').flush(empty);
  });

  it('retries the same query after a failure', async () => {
    component.show();
    component.changeQuery('payment');
    await vi.advanceTimersByTimeAsync(301);
    http
      .expectOne((value) => value.params.get('q') === 'payment')
      .error(new ProgressEvent('failed'));

    component.retry();
    expect(component.failed()).toBe(false);
    // The debounce itself is quiet. Loading starts only when the retry reaches the server.
    expect(component.loading()).toBe(false);
    await vi.advanceTimersByTimeAsync(301);
    http.expectOne((value) => value.params.get('q') === 'payment').flush(empty);
    expect(component.failed()).toBe(false);
  });

  function recentItem(id: string, itemType: WorkItemKind, code: string) {
    return {
      itemType,
      id,
      code,
      title: 'Item ' + code,
      project: { id: 'p7', code: '7', name: 'Payment Gateway' },
      status: { id: 1, code: 'New', name: 'New' },
    };
  }

  async function openWithRecent() {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    http.expectOne(`${projectApiUrl}/search`).flush({
      ...empty,
      recent: [
        recentItem('a', WorkItemKind.Subtask, '70'),
        recentItem('b', WorkItemKind.Task, '34'),
      ],
    });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /* A row lit before anything was pressed reads as already chosen, and beside a hovered row it
     made two look selected. */
  it('lights no row until the pointer or the arrows pick one', async () => {
    const element = await openWithRecent();

    expect(element.querySelectorAll('.row--active')).toHaveLength(0);
  });

  const press = (element: HTMLElement, key: string) =>
    element
      .querySelector('input')!
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  const pointAt = (row: Element, x: number, y: number) =>
    row.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));

  it('walks the rows with the arrows', async () => {
    const element = await openWithRecent();

    press(element, 'ArrowDown');
    expect(component.activeId()).toBe('a');
    press(element, 'ArrowDown');
    expect(component.activeId()).toBe('b');
    press(element, 'ArrowUp');
    expect(component.activeId()).toBe('a');
  });

  it('keeps a single highlight for the pointer and the arrows', async () => {
    const element = await openWithRecent();
    const rows = element.querySelectorAll('app-search-result-row');

    pointAt(rows[1], 10, 40);
    expect(component.activeId()).toBe('b');

    press(element, 'ArrowDown');
    fixture.detectChanges();

    expect(element.querySelectorAll('.row--active, .row--hoverable')).toHaveLength(1);
    expect(component.activeId()).toBe('a');
  });

  /* Arrows scroll the list under a cursor that stays put, and the browser reports the row that
     slid under it. That must not take the highlight back from the keyboard. */
  it('ignores a pointer that did not move', async () => {
    const element = await openWithRecent();
    const rows = element.querySelectorAll('app-search-result-row');

    pointAt(rows[0], 10, 40);
    press(element, 'ArrowDown');
    pointAt(rows[0], 10, 40);

    expect(component.activeId()).toBe('b');
  });

  /* The empty-state hint used to flash for the moment the recent list took to arrive. */
  it('draws nothing until the recent list arrives', async () => {
    component.show();
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.search-dropdown')).toBeNull();

    http.expectOne(`${projectApiUrl}/search`).flush(empty);
    fixture.detectChanges();
    expect(element.querySelector('.search-dropdown')).not.toBeNull();
  });

  /* Coming back to an empty field shows the list already fetched, not the hint and then the list. */
  it('shows the recent list at once when the field is cleared', async () => {
    const element = await openWithRecent();

    component.changeQuery('платеж');
    await vi.advanceTimersByTimeAsync(301);
    http.expectOne((value) => value.params.get('q') === 'платеж').flush(empty);

    component.changeQuery('');
    fixture.detectChanges();
    expect(element.querySelectorAll('app-search-result-row')).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1);
    http.expectOne((value) => value.params.keys().length === 0).flush(empty);
  });

  it('names the kind of each item next to its code', async () => {
    const element = await openWithRecent();

    expect(element.querySelector('.row__code')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Subtask #70',
    );
  });
});
