import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { currentLanguage } from '../i18n/active-language';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);

  return next(
    req.clone({
      setHeaders: { 'Accept-Language': currentLanguage() },
    }),
  );
};
