import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CommentModel } from '../../../../../core/models/comments';
import { CommentActionsService } from '../../comment-actions.service';
import { CommentCardComponent } from './comment-card.component';

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
      providers: [provideRouter([])],
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

  it('shows a deleted comment as one line saying who deleted whose comment, without its text', () => {
    const element = render(
      comment({ isDeleted: true, text: '', deletedBy: rustam, deletedAt: '2026-10-02T09:00:00Z' }),
    );

    const line = element.querySelector('.card__deleted')?.textContent?.replace(/\s+/g, ' ');
    expect(line).toContain('Rustam Agaev deleted a comment by Ann Lee');
    expect(element.textContent).not.toContain('Secret plan');
    expect(element.querySelector('button')).toBeNull();
  });

  it('says the author deleted their own comment', () => {
    const element = render(comment({ isDeleted: true, text: '', deletedBy: ann }));

    expect(element.querySelector('.card__deleted')?.textContent).toContain(
      'Ann Lee deleted their comment',
    );
  });

  it('says only that it was deleted until the server names who did it', () => {
    const element = render(comment({ isDeleted: true, text: '' }));

    expect(element.querySelector('.card__deleted')?.textContent).toContain(
      'This comment was deleted',
    );
  });
});
