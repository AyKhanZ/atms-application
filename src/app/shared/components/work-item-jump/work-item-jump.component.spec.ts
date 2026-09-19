import { WorkItemKind } from '../../../core/models/work-items';
import { TestBed } from '@angular/core/testing';
import { WorkItemJumpComponent } from './work-item-jump.component';

describe('WorkItemJumpComponent', () => {
  /** jsdom lays nothing out, so the width that decides panel or sheet has to be stated. */
  function viewportWidth(width: number) {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(width);
  }

  async function setup(width = 1200) {
    viewportWidth(width);
    await TestBed.configureTestingModule({ imports: [WorkItemJumpComponent] }).compileComponents();
    const fixture = TestBed.createComponent(WorkItemJumpComponent);
    fixture.componentRef.setInput('current', { id: '1', code: '1', title: 'Current' });
    fixture.componentRef.setInput('items', [
      { id: '1', code: '1', title: 'Current' },
      { id: '2', code: '2', title: 'Sibling' },
    ]);
    fixture.componentRef.setInput('groupLabel', 'Siblings');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    document.body.appendChild(element);
    const panel = element.querySelector<HTMLElement>('[popover]');
    const trigger = element.querySelector<HTMLButtonElement>('.work-item-jump-trigger');
    if (!panel || !trigger) throw new Error('Missing popover elements');
    let visible = false;
    panel.showPopover = vi.fn(() => {
      visible = true;
    });
    panel.hidePopover = vi.fn(() => {
      visible = false;
    });
    const matches = panel.matches.bind(panel);
    vi.spyOn(panel, 'matches').mockImplementation((selector) =>
      selector === ':popover-open' ? visible : matches(selector),
    );
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(new DOMRect(300, 500, 300, 50));
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 400));
    return { fixture, element, panel, trigger, component: fixture.componentInstance };
  }

  it('opens above the trigger and returns focus on Escape', async () => {
    const { fixture, component, panel, trigger, element } = await setup();
    component.toggle();
    expect(panel.showPopover).toHaveBeenCalledOnce();
    expect(panel.style.top).toBe('92px');
    expect(document.activeElement).toBe(element.querySelector('input'));
    component.onEscape(new Event('keydown'));
    expect(panel.hidePopover).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
    element.remove();
  });

  it('comes up as a sheet on a narrow screen instead of aiming at the trigger', async () => {
    const { fixture, component, panel, element } = await setup(390);

    component.toggle();

    expect(component.sheet()).toBe(true);
    // Nothing is positioned by hand: a sheet is placed by the stylesheet.
    expect(panel.style.top).toBe('');
    expect(panel.style.left).toBe('');
    expect(panel.style.width).toBe('');

    fixture.destroy();
    element.remove();
  });

  it('keeps internal scrolling open and closes on page scroll', async () => {
    const { fixture, component, element } = await setup();
    component.toggle();
    element.querySelector('.work-item-jump-list')?.dispatchEvent(new Event('scroll'));
    expect(component.open()).toBe(true);
    document.dispatchEvent(new Event('scroll'));
    expect(component.open()).toBe(false);
    fixture.destroy();
    element.remove();
  });

  it('highlights the current item and only emits a different selection', async () => {
    const { fixture, component, element } = await setup();
    const selected = vi.fn();
    component.selected.subscribe(selected);
    expect(element.querySelector('[aria-selected="true"]')?.textContent).toContain('Current');
    component.choose('1');
    expect(selected).not.toHaveBeenCalled();
    component.choose('2');
    expect(selected).toHaveBeenCalledWith('2');
    fixture.destroy();
    element.remove();
  });

  it('uses the same hierarchy depth and item icon as the parent select', async () => {
    const { fixture, element } = await setup();
    fixture.componentRef.setInput('context', [
      { icon: 'pi-folder', title: 'Group' },
      { icon: 'pi-flag', title: 'Milestone' },
    ]);
    fixture.componentRef.setInput('kind', WorkItemKind.Ticket);
    fixture.detectChanges();

    const levels = element.querySelectorAll<HTMLElement>('.work-item-jump-context__level');
    const option = element.querySelector<HTMLElement>('.work-item-jump-option');
    expect(levels[0].style.paddingLeft).toBe('0.75rem');
    expect(levels[1].style.paddingLeft).toBe('1.95rem');
    expect(option?.style.getPropertyValue('--tree-depth')).toBe('2');
    expect(option?.querySelector('.pi-ticket')).not.toBeNull();
    expect(option?.querySelector('.work-item-jump-option__title')?.tagName).toBe('SPAN');

    fixture.destroy();
    element.remove();
  });
});
