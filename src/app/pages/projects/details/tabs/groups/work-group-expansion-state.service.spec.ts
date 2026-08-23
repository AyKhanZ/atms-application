import { TestBed } from '@angular/core/testing';
import { WorkGroupExpansionStateService } from './work-group-expansion-state.service';

describe('WorkGroupExpansionStateService', () => {
  it('keeps an isolated copy of the expanded groups for each project', () => {
    TestBed.configureTestingModule({ providers: [WorkGroupExpansionStateService] });
    const service = TestBed.inject(WorkGroupExpansionStateService);
    const expandedGroupIds = new Set(['group-1']);

    service.set('project-1', expandedGroupIds);
    expandedGroupIds.add('group-2');

    const restored = service.get('project-1');
    restored?.add('group-3');

    expect(service.get('project-1')).toEqual(new Set(['group-1']));
    expect(service.get('project-2')).toBeUndefined();
  });
});
