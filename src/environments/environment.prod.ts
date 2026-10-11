import { EnvironmentProviders } from '@angular/core';

// Empty so requests stay relative (/admin/..., /project/...). nginx serves the
// app and proxies those prefixes on the same host.
const apiUrl = '';

export const environment = {
  production: true,
  apiUrl,
  healthUrl: `${apiUrl}/admin/health/ready`,
  // no devtools import, so the package stays out of the production bundle
  providers: [] satisfies EnvironmentProviders[],
};
