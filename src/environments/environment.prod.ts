import { EnvironmentProviders } from '@angular/core';

// no real domain yet, the gateway runs on the same machine
const apiUrl = 'http://localhost:5000';

export const environment = {
  production: true,
  apiUrl,
  healthUrl: `${apiUrl}/admin/health/ready`,
  // no devtools import, so the package stays out of the production bundle
  providers: [] satisfies EnvironmentProviders[],
};
