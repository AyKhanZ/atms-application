import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImageUrlService {
  private readonly apiOrigin = new URL(environment.apiUrl, window.location.origin).origin;
  private readonly imagesPath = '/app/images';

  normalize(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    if (value.startsWith('/')) {
      return `${this.apiOrigin}${value}`;
    }

    try {
      const url = new URL(value);

      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${this.apiOrigin}${url.pathname}${url.search}${url.hash}`;
      }

      return value;
    } catch {
      return `${this.apiOrigin}${this.imagesPath}/${value.replace(/^\/+/, '')}`;
    }
  }
}
