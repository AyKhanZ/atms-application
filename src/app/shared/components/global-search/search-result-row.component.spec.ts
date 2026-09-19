import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalSearchItemModel } from '../../../core/models/global-search';
import { WorkItemKind } from '../../../core/models/work-items';
import { SearchResultRowComponent } from './search-result-row.component';

function item(extra: Partial<GlobalSearchItemModel> = {}): GlobalSearchItemModel {
  return {
    itemType: WorkItemKind.Task,
    id: 'task-34',
    code: '34',
    title: 'Интеграция платежного шлюза',
    project: { id: 'p7', code: '7', name: 'Payment Gateway' },
    status: { id: 1, code: 'New', name: 'New' },
    group: { id: 'g1', name: 'Phase 1' },
    milestone: { id: 'm1', name: 'Financial Analytics' },
    ticket: { id: 't28', code: '28', name: 'Mock service' },
    ...extra,
  };
}

describe('SearchResultRowComponent', () => {
  let fixture: ComponentFixture<SearchResultRowComponent>;

  async function render(value: GlobalSearchItemModel, query = '') {
    await TestBed.configureTestingModule({
      imports: [SearchResultRowComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SearchResultRowComponent);
    fixture.componentRef.setInput('item', value);
    fixture.componentRef.setInput('query', query);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks every occurrence of what was typed', async () => {
    await render(item(), 'плат');
    const parts = fixture.componentInstance.titleParts();

    expect(parts.filter((part) => part.matched).map((part) => part.text)).toEqual(['плат']);
    expect(parts.map((part) => part.text).join('')).toBe('Интеграция платежного шлюза');
  });

  /* The title is split into pieces to mark the match, and the pieces must join back into exactly
     the original text — a stray space around the highlight breaks the word in two on screen. */
  it('draws the title with no space added around the highlight', async () => {
    const element = await render(item(), 'плат');

    expect(element.querySelector('.row__title')?.textContent).toBe('Интеграция платежного шлюза');
  });

  it('matches whatever the case', async () => {
    await render(item({ title: 'Payment Gateway' }), 'GATE');

    expect(fixture.componentInstance.titleParts().filter((part) => part.matched)).toEqual([
      { text: 'Gate', matched: true },
    ]);
  });

  it('leaves the title whole when nothing was typed', async () => {
    await render(item());

    expect(fixture.componentInstance.titleParts()).toEqual([
      { text: 'Интеграция платежного шлюза', matched: false },
    ]);
  });

  it('shows where a subtask sits, down to its parent task', async () => {
    await render(
      item({
        itemType: WorkItemKind.Subtask,
        parentTask: { id: 't34', code: '34', name: 'Integration' },
      }),
    );

    expect(fixture.componentInstance.trail().map((step) => step.label)).toEqual([
      'Payment Gateway',
      'Phase 1',
      'Financial Analytics',
      '#28 Mock service',
      '#34 Integration',
    ]);
  });

  // A project is the start of every other chain, so it has none of its own.
  it('gives a project no trail', async () => {
    await render(item({ itemType: WorkItemKind.Project }));

    expect(fixture.componentInstance.trail()).toEqual([]);
  });

  it('uses its own icon for each kind', async () => {
    await render(item({ itemType: WorkItemKind.Subtask }));
    expect(fixture.componentInstance.kind().icon).toBe('pi-sitemap');

    fixture.componentRef.setInput('item', item({ itemType: WorkItemKind.Ticket }));
    fixture.detectChanges();
    expect(fixture.componentInstance.kind().icon).toBe('pi-ticket');

    fixture.componentRef.setInput('item', item({ itemType: WorkItemKind.Project }));
    fixture.detectChanges();
    expect(fixture.componentInstance.kind().icon).toBe('pi-briefcase');
  });

  it('collapses intermediate locations while keeping the complete path in the tooltip', async () => {
    const element = await render(
      item({
        itemType: WorkItemKind.Subtask,
        parentTask: { id: 't34', code: '34', name: 'Integration' },
      }),
    );

    expect(
      Array.from(element.querySelectorAll('.row__trail-step')).map((step) =>
        step.textContent?.trim(),
      ),
    ).toEqual(['Payment Gateway', '#34 Integration']);
    expect(element.querySelector('.row__trail')?.getAttribute('title')).toBe(
      'Payment Gateway › Phase 1 › Financial Analytics › #28 Mock service › #34 Integration',
    );
    expect(element.querySelector('.row__trail-overflow')?.textContent).toBe('…');
  });
});
