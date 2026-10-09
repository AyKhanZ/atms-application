import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  // the file name has no build hash, so ask the server every time: a cached file after a deploy
  // would show new keys in english; an unchanged file costs a 304 without a body
  getTranslation(lang: string): Observable<Translation> {
    return this.http.get<Translation>(`/i18n/${lang}.json`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  }
}
