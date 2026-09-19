import { TestBed } from '@angular/core/testing';
import { BreadcrumbOverrideService } from './breadcrumb-override.service';

describe('BreadcrumbOverrideService', () => {
  let service: BreadcrumbOverrideService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BreadcrumbOverrideService);
  });

  it('starts with no overrides', () => {
    expect(service.value()).toEqual({});
  });

  it('registers a title for a path', () => {
    service.set('/projects/7', '#7 Payment Gateway Integration');

    expect(service.value()).toEqual({
      '/projects/7': { title: '#7 Payment Gateway Integration', icon: undefined },
    });
  });

  it('replaces the title when the same path is set again', () => {
    service.set('/projects/7', 'Project');
    service.set('/projects/7', '#7 Payment Gateway Integration');

    expect(service.value()['/projects/7'].title).toBe('#7 Payment Gateway Integration');
  });

  it('keeps sibling paths independent', () => {
    service.set('/projects/7', '#7 Project');
    service.set('/projects/7/tickets/28', '#28 Ticket');
    service.clear('/projects/7/tickets/28');

    expect(service.value()).toEqual({ '/projects/7': { title: '#7 Project', icon: undefined } });
  });

  it('keeps the icon next to the title', () => {
    service.set('/projects/7/tickets/28', '#28 Ticket', 'pi-ticket');

    expect(service.value()['/projects/7/tickets/28']).toEqual({
      title: '#28 Ticket',
      icon: 'pi-ticket',
    });
  });

  it('emits a new object reference so computed consumers recompute', () => {
    const before = service.value();
    service.set('/projects/7', '#7 Project');

    expect(service.value()).not.toBe(before);
  });

  it('leaves the map untouched when clearing a path that was never set', () => {
    service.set('/projects/7', '#7 Project');
    const before = service.value();

    service.clear('/projects/999');

    expect(service.value()).toBe(before);
  });
});
