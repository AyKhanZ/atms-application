import { EnvironmentProviders } from '@angular/core';
import { provideStoreDevtools } from '@ngrx/store-devtools';

const apiUrl = 'http://localhost:5000';

export const environment = {
  production: false,
  apiUrl,
  healthUrl: `${apiUrl}/admin/health/ready`,
  providers: [provideStoreDevtools({ maxAge: 25 })] satisfies EnvironmentProviders[],
};
