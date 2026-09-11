import { TestBed } from '@angular/core/testing';
import { WorkItemFactsComponent } from './work-item-facts.component';

describe('WorkItemFactsComponent', () => {
  it.each([false, true])(
    'renders shared facts with optional type=%s and no duplicate status',
    async (hasType) => {
      await TestBed.configureTestingModule({
        imports: [WorkItemFactsComponent],
      }).compileComponents();
      const fixture = TestBed.createComponent(WorkItemFactsComponent);
      fixture.componentRef.setInput('facts', {
        priority: { id: 1, name: 'Low', code: 'Low' },
        ...(hasType ? { type: { id: 2, name: 'Bug', code: 'Bug' } } : {}),
      });
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement;
      const labels = [...element.querySelectorAll('dt')].map((node) => node.textContent?.trim());
      expect(labels).toEqual(
        hasType
          ? ['Type', 'Priority', 'Assignee', 'Deadline']
          : ['Priority', 'Assignee', 'Deadline'],
      );
      expect(element.textContent).toContain('Information');
      expect(element.textContent).toContain('Unassigned');
      expect(element.textContent).toContain('Not set');
    },
  );
});
