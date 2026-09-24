import { TestBed } from '@angular/core/testing';
import { AttachmentRefusedComponent } from './attachment-refused.component';

describe('AttachmentRefusedComponent', () => {
  function render(items: { id: string; fileName: string; reason: string }[]) {
    const fixture = TestBed.createComponent(AttachmentRefusedComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    return fixture;
  }

  /* Ten .md files are one problem: one reason, ten names — not ten copies of the same sentence. */
  it('puts files refused for the same reason under one line', () => {
    const fixture = render([
      { id: '1', fileName: 'a.md', reason: 'Type not supported.' },
      { id: '2', fileName: 'b.md', reason: 'Type not supported.' },
      { id: '3', fileName: 'big.pdf', reason: 'Larger than 25 MB.' },
    ]);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('strong')?.textContent).toBe('3 files were not added');
    const reasons = Array.from(element.querySelectorAll('.refused__reason')).map((node) => node.textContent);
    expect(reasons).toEqual(['Type not supported.', 'Larger than 25 MB.']);
    expect(element.querySelectorAll('.refused__name').length).toBe(3);
  });

  it('speaks of one file in the singular', () => {
    const fixture = render([{ id: '1', fileName: 'a.md', reason: 'Type not supported.' }]);

    expect((fixture.nativeElement as HTMLElement).querySelector('strong')?.textContent).toBe(
      '1 file was not added',
    );
  });
});
