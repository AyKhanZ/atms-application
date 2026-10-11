import { HttpRequest, HttpResponse } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { adminApiUrl, projectApiUrl } from '../constants/api-url.constants';
import { currentLanguage } from '../i18n/active-language';
import { languageInterceptor } from './language.interceptor';

describe('languageInterceptor', () => {
  afterEach(() => {
    currentLanguage.set('en');
  });

  it.each([`${adminApiUrl}/users`, `${projectApiUrl}/project/project-1`])(
    'sets Accept-Language on %s',
    async (url) => {
      currentLanguage.set('ru');

      const forwarded = await forward(url);

      expect(forwarded.headers.get('Accept-Language')).toBe('ru');
    },
  );

  it.each([
    '/i18n/en.json',
    'https://example.com/static/app.js',
    `${environment.apiUrl}/admin/health/ready`,
  ])('does not set Accept-Language on %s', async (url) => {
    const forwarded = await forward(url);

    expect(forwarded.headers.has('Accept-Language')).toBe(false);
  });

  function forward(url: string): Promise<HttpRequest<unknown>> {
    const request = new HttpRequest('GET', url);
    let forwarded: HttpRequest<unknown> | undefined;

    const result = languageInterceptor(request, (outgoing) => {
      forwarded = outgoing;
      return of(new HttpResponse({ status: 200 }));
    });

    return firstValueFrom(result).then(() => {
      if (!forwarded) {
        throw new Error('interceptor did not call next');
      }

      return forwarded;
    });
  }
});
