import { HttpInterceptorFn } from '@angular/common/http';
import { adminApiUrl, projectApiUrl } from '../constants/api-url.constants';
import { currentLanguage } from '../i18n/active-language';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  // apiUrl is empty in production, so startsWith(apiUrl) would match every request.
  const isApiRequest = req.url.startsWith(adminApiUrl) || req.url.startsWith(projectApiUrl);
  if (!isApiRequest) return next(req);

  return next(
    req.clone({
      setHeaders: { 'Accept-Language': currentLanguage() },
    }),
  );
};
