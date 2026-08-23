import { Injectable } from '@angular/core';

@Injectable()
export class WorkGroupExpansionStateService {
  private readonly projectStates = new Map<string, Set<string>>();

  get(projectId: string): Set<string> | undefined {
    const expandedGroupIds = this.projectStates.get(projectId);

    return expandedGroupIds ? new Set(expandedGroupIds) : undefined;
  }

  set(projectId: string, expandedGroupIds: Set<string>): void {
    this.projectStates.set(projectId, new Set(expandedGroupIds));
  }
}
