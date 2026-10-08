import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AuthSessionService } from '../services/auth-session.service';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  confirmUnsavedChanges?(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  // after logout there is nothing to save, dont ask
  if (!inject(AuthSessionService).isAuthenticated()) return true;
  if (!component.hasUnsavedChanges()) return true;
  if (component.confirmUnsavedChanges) return component.confirmUnsavedChanges();

  return window.confirm('You have unsaved changes. Leave this page anyway?');
};
