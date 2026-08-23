import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
  confirmUnsavedChanges?(): boolean | Promise<boolean>;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  if (component.confirmUnsavedChanges) return component.confirmUnsavedChanges();

  return window.confirm('You have unsaved changes. Leave this page anyway?');
};
