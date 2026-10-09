import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommentModel } from '../../../../../core/models/comments';
import { CommentActionsService } from '../../comment-actions.service';
import { CommentCardComponent } from './comment-card.component';

import { translocoTestingProviders } from '../../../../../core/testing/transloco-testing';
describe('CommentCardComponent', () => {
  const ann = { id: 'ann', name: 'Ann', surname: 'Lee' };
  const rustam = { id: 'rustam', name: 'Rustam', surname: 'Agaev' };
  const comment = (change: Partial<CommentModel> = {}): CommentModel => ({
    id: 'c1',
    text: 'Secret plan',
    createdAt: '2026-10-01T10:00:00Z',
    createdBy: ann,
    updatedAt: null,
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    canEdit: true,
    canDelete: true,
    mentions: [],
    references: [],
    ...change,
  });

  function render(model: CommentModel): HTMLElement {
    TestBed.configureTestingModule({
      providers: [...translocoTestingProviders(), provideRouter([])],
    }).overrideComponent(CommentCardComponent, {
      add: {
        providers: [
          {
            provide: CommentActionsService,
            useValue: { editingId: signal(null), saving: signal(false), editError: signal(null) },
          },
        ],
      },
    });
    const fixture = TestBed.createComponent(CommentCardComponent);
    fixture.componentRef.setInput('comment', model);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const deletedLine = (element: HTMLElement) =>
    element.querySelector('.card__deleted')?.textContent?.replace(/\s+/g, ' ').trim();

  it('keeps a deleted comment as a card with its author, saying who deleted it, without its text', () => {
    const element = render(
      comment({ isDeleted: true, text: '', deletedBy: rustam, deletedAt: '2026-10-02T09:00:00Z' }),
    );

    expect(element.querySelector('.card__author')?.textContent).toContain('Ann Lee');
    expect(deletedLine(element)).toContain('Comment deleted by Rustam Agaev');
    expect(element.textContent).not.toContain('Secret plan');
    expect(element.querySelector('button')).toBeNull();
  });

  it('does not name the author again when they deleted it themselves', () => {
    const element = render(comment({ isDeleted: true, text: '', deletedBy: ann }));

    expect(deletedLine(element)).toBe('Comment deleted');
  });

  it('says only that it was deleted until the server names who did it', () => {
    const element = render(comment({ isDeleted: true, text: '' }));

    expect(deletedLine(element)).toBe('Comment deleted');
  });
});
