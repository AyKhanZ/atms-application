import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { GlobalSearchModel } from '../../../../../core/models/global-search';
import { WorkItemKind } from '../../../../../core/models/work-items';
import { GlobalSearchService } from '../../../../../core/services/global-search.service';
import { CommentEditorComponent } from './comment-editor.component';

describe('CommentEditorComponent', () => {
  const ann = { id: '0f8fad5b-d9cb-469f-a165-70867728950e', name: 'Ann', surname: 'Lee' };
  let fixture: ComponentFixture<CommentEditorComponent>;
  let sent: string[];
  const found: GlobalSearchModel = {
    projects: { items: [], hasMore: false },
    tickets: {
      items: [
        {
          itemType: WorkItemKind.Ticket,
          id: 't1',
          code: '208',
          title: 'Opening test',
          project: { id: 'p', code: '180', name: 'Resort' },
          status: { id: 2, code: 'InProgress', name: 'In progress' },
        },
      ],
      hasMore: false,
    },
    tasks: { items: [], hasMore: false },
    subtasks: { items: [], hasMore: false },
    recent: [],
  };

  function render(initialText = '') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: GlobalSearchService,
          useValue: { search: () => of(found), recent: () => of(found) },
        },
      ],
    });
    fixture = TestBed.createComponent(CommentEditorComponent);
    fixture.componentRef.setInput('people', [ann]);
    fixture.componentRef.setInput('initialText', initialText);
    sent = [];
    fixture.componentInstance.submitted.subscribe((text) => sent.push(text));
    fixture.detectChanges();
    return field();
  }

  const field = () =>
    (fixture.nativeElement as HTMLElement).querySelector('textarea') as HTMLTextAreaElement;

  function type(value: string) {
    const element = field();
    element.value = value;
    element.setSelectionRange(value.length, value.length);
    element.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function press(key: string, init: KeyboardEventInit = {}) {
    field().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    );
    fixture.detectChanges();
  }

  it('sends the trimmed text with Ctrl+Enter', () => {
    render();
    type('  Looks good  ');
    press('Enter', { ctrlKey: true });

    expect(sent).toEqual(['Looks good']);
  });

  it('does not send an empty comment', () => {
    render();
    type('   ');
    press('Enter', { ctrlKey: true });

    expect(sent).toEqual([]);
  });

  it('shows a picked person by name and sends the mention as a token', () => {
    render();
    type('ask @an');

    const option = (fixture.nativeElement as HTMLElement).querySelector('[role="option"]');
    expect(option?.textContent).toContain('Ann Lee');

    press('Enter');
    expect(field().value).toBe('ask @Ann Lee ');

    press('Enter', { ctrlKey: true });
    expect(sent).toEqual([`ask @[user:${ann.id}]`]);
  });

  it('opens an edit with names in place of the stored tokens', () => {
    render(`@[user:${ann.id}] please check`);

    expect(field().value).toBe('@Ann Lee please check');
  });

  it('makes the selection bold with Ctrl+B', () => {
    render();
    type('a big bug');
    field().setSelectionRange(2, 5);
    press('b', { ctrlKey: true });

    expect(field().value).toBe('a **big** bug');
  });

  it('counts the stored length and never sends more than 2000', () => {
    render();
    type('x'.repeat(1900));
    const counter = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.editor__meta em')?.textContent?.trim();
    expect(counter()).toBe('1900/2000');

    type('x'.repeat(2001));
    press('Enter', { ctrlKey: true });
    expect(counter()).toBe('2001/2000');
    expect(sent).toEqual([]);
  });

  it('shows the toolbar and the buttons only while the field is in use', () => {
    render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="toolbar"]')).toBeNull();

    field().dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    expect(element.querySelector('[role="toolbar"]')).not.toBeNull();
    expect(element.textContent).toContain('Cancel');
  });

  it('empties the field on Cancel and puts it back at rest', () => {
    render();
    let cancelled = 0;
    fixture.componentInstance.cancelled.subscribe(() => cancelled++);
    type('draft');
    const cancel = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((button) => button.textContent?.trim() === 'Cancel');

    cancel?.click();
    fixture.detectChanges();

    expect(field().value).toBe('');
    expect(cancelled).toBe(1);
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="toolbar"]')).toBeNull();
  });

  it('previews the markup and the mentioned names as they will look', () => {
    render();
    type('ask @an');
    press('Enter');
    type(`${field().value}about **this**`);

    const preview = (fixture.nativeElement as HTMLElement).querySelector('.editor__preview');
    expect(preview?.querySelector('strong')?.textContent).toBe('this');
    expect(preview?.querySelector('.comment-mention')?.textContent).toBe('@Ann Lee');
  });

  it('goes on with the list on Enter and ends it on an empty item', () => {
    render();
    type('- first');
    press('Enter');
    expect(field().value).toBe('- first\n- ');

    press('Enter');
    expect(field().value).toBe('- first\n');
  });

  it('keeps the field to 2000 stored characters, mentions counted as stored', () => {
    render();
    expect(field().getAttribute('maxlength')).toBe('2000');

    type('ask @an');
    press('Enter');

    // "@Ann Lee" is 8 characters on screen and 44 stored.
    expect(field().getAttribute('maxlength')).toBe(String(2000 - 36));
  });

  it('previews a picked ticket as its badge, not as a bare code', () => {
    vi.useFakeTimers();
    try {
      render();
      type('see #20');
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      press('Enter');

      const badge = (fixture.nativeElement as HTMLElement).querySelector(
        '.editor__preview .comment-ref',
      );
      expect(field().value).toBe('see #208 ');
      expect(badge?.textContent).toContain('Opening test');
    } finally {
      vi.useRealTimers();
    }
  });

  it('names the project under # only for work from another project', () => {
    vi.useFakeTimers();
    try {
      render();
      const meta = () =>
        (fixture.nativeElement as HTMLElement).querySelector('.suggestion__meta')?.textContent;
      type('see #20');
      vi.advanceTimersByTime(250);
      fixture.detectChanges();
      expect(meta()).toBe('Resort');

      fixture.componentRef.setInput('projectId', 'p');
      fixture.detectChanges();
      expect(meta()).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ticks a check-list item in the field when its box is clicked in the preview', () => {
    render();
    type('- [ ] write tests');
    const box = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.editor__preview [role="checkbox"]',
    );

    box?.click();
    fixture.detectChanges();

    expect(field().value).toBe('- [x] write tests');
  });

  it('moves a list line a level in with Tab and leaves Tab alone in plain text', () => {
    render();
    type('- a\n- b');
    press('Tab');
    expect(field().value).toBe('- a\n  - b');

    type('plain');
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    field().dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
  });

  it('opens the palette from the one highlight button and marks in the colour picked', () => {
    render();
    type('a big bug');
    field().setSelectionRange(2, 5);
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('[aria-label="Highlight"]')?.click();
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('[aria-label="Highlight in green"]')?.click();
    fixture.detectChanges();

    expect(field().value).toBe('a ==green:big== bug');
    expect(element.querySelector('.editor__palette')).toBeNull();
  });
});
