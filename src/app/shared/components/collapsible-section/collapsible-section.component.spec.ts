import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CollapsibleSectionComponent } from './collapsible-section.component';

@Component({
  imports: [CollapsibleSectionComponent],
  template: `<app-collapsible-section title="Description" [(open)]="open">
    <p class="content">Text</p>
  </app-collapsible-section>`,
})
class HostComponent {
  readonly open = signal(true);
}

describe('CollapsibleSectionComponent', () => {
  it('folds and unfolds on its title and tells the page', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const title = element.querySelector('button') as HTMLButtonElement;

    expect(element.querySelector('.content')).not.toBeNull();
    expect(title.getAttribute('aria-expanded')).toBe('true');

    title.click();
    fixture.detectChanges();

    expect(element.querySelector('.content')).toBeNull();
    expect(title.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.open()).toBe(false);
  });
});
