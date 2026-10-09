import { inject } from '@angular/core';
import { LanguageService } from '../services/language.service';

export function languageInitializer(): Promise<void> {
  return inject(LanguageService).init().then(() => undefined);
}
