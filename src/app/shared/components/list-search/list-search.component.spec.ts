import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListSearchComponent } from './list-search.component';

describe('ListSearchComponent', () => {
  let fixture: ComponentFixture<ListSearchComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ListSearchComponent] }).compileComponents();
    fixture = TestBed.createComponent(ListSearchComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  const clear = () => element.querySelector<HTMLButtonElement>('.input-clear');

  it('offers no cross while the field is empty', () => {
    fixture.detectChanges();

    expect(clear()).toBeNull();
  });

  it('empties the field and keeps the cursor in it', () => {
    fixture.componentRef.setInput('value', 'payment');
    fixture.detectChanges();
    const emitted: string[] = [];
    fixture.componentInstance.valueChange.subscribe((value) => emitted.push(value));

    clear()!.click();

    expect(emitted).toEqual(['']);
    expect(document.activeElement).toBe(element.querySelector('input'));
  });

  // A disabled field cannot be changed, so a cross on it would promise something it cannot do.
  it('hides the cross on a disabled field', () => {
    fixture.componentRef.setInput('value', 'payment');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    expect(clear()).toBeNull();
  });

  it('names the field for screen readers by its placeholder', () => {
    fixture.componentRef.setInput('placeholder', 'Search projects');
    fixture.detectChanges();

    expect(element.querySelector('input')?.getAttribute('aria-label')).toBe('Search projects');
  });
});
