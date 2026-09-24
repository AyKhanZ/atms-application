import { Injectable } from '@angular/core';

export interface AttachmentTreeExpansion {
  expanded: Set<string>;
  /** Nodes already given their default state, so a reload does not reopen what was closed. */
  seen: Set<string>;
}

/**
 * Which branches of an attachments tree are open, kept while the details page lives: leaving the
 * Attachments tab for Details and coming back finds the tree as it was left. Provided by each
 * details page, so it goes away with the page.
 */
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
