import { Injectable } from '@angular/core';

export interface AttachmentTreeExpansion {
  expanded: Set<string>;
  // so a reload doesnt reopen what was closed
  seen: Set<string>;
}

// open branches kept while the details page lives, provided per details page
@Injectable()
export class AttachmentTreeExpansionService {
  private readonly states = new Map<string, AttachmentTreeExpansion>();

  get(stateKey: string): AttachmentTreeExpansion {
    let state = this.states.get(stateKey);
    if (!state) {
      state = { expanded: new Set(), seen: new Set() };
      this.states.set(stateKey, state);
    }
    return state;
  }
}
