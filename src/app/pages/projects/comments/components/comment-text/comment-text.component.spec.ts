import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommentReferenceModel } from '../../../../../core/models/comments';
import { CommentTextComponent } from './comment-text.component';

describe('CommentTextComponent', () => {
  const annId = '0f8fad5b-d9cb-469f-a165-70867728950e';
  const reference: CommentReferenceModel = {
    code: '41',
    type: 'task',
    isSubtask: false,
    title: 'Fix payment form',
    status: { id: 2, code: 'InProgress', name: 'In progress' },
    ref: { projectId: 'p', workTicketId: 't', workTaskId: 'k' },
  };

  function render(text: string, references: CommentReferenceModel[] = []) {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CommentTextComponent);
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('mentions', [{ id: annId, name: 'Ann', surname: 'Lee' }]);
    fixture.componentRef.setInput('references', references);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('draws the markup with elements and keeps the words together', () => {
    const element = render('Fails **only** on _Safari_\n- open\n- save');

    expect(element.querySelector('p')?.textContent).toBe('Fails only on Safari');
    expect(element.querySelector('strong')?.textContent).toBe('only');
    expect(element.querySelector('em')?.textContent).toBe('Safari');
    expect(Array.from(element.querySelectorAll('li')).map((item) => item.textContent)).toEqual([
      'open',
      'save',
    ]);
  });

  it('shows HTML from the text as text, never as elements', () => {
    const element = render('<img src=x onerror=alert(1)> <script>alert(1)</script>');

    expect(element.querySelector('img, script')).toBeNull();
    expect(element.textContent).toContain('<script>alert(1)</script>');
  });

  it('opens links in a new tab without handing over the page', () => {
    const link = render('see https://baim.az/docs').querySelector('a');

    expect(link?.getAttribute('href')).toBe('https://baim.az/docs');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('names mentioned people by their current name and marks an unknown one', () => {
    const element = render(`@[user:${annId}] and @[user:11111111-1111-1111-1111-111111111111]`);

    expect(
      Array.from(element.querySelectorAll('.comment-mention')).map((item) => item.textContent),
    ).toEqual(['@Ann Lee', '@Unknown user']);
  });

  it('links a readable work item with its title and leaves an unknown code as text', () => {
    const element = render('See #41 and #99', [reference]);
    const link = element.querySelector<HTMLAnchorElement>('a.comment-ref');

    expect(link?.getAttribute('href')).toBe('/projects/p/tickets/t/tasks/k');
    expect(link?.textContent).toContain('Fix payment form');
    expect(element.textContent).toContain('#99');
    expect(element.querySelectorAll('a.comment-ref').length).toBe(1);
  });

  it('shows the ticks of a saved check list without letting a click change them', () => {
    const element = render('- [x] done\n  - [ ] nested');

    expect(element.querySelectorAll('[role="checkbox"]').length).toBe(0);
    expect(element.querySelectorAll('[role="img"]').length).toBe(2);
    expect(element.querySelector('app-comment-list app-comment-list')).not.toBeNull();
  });
});
