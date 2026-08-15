const apiUrl = 'https://your-production-domain.com';

export const environment = {
  production: true,
  apiUrl,
  healthUrl: `${apiUrl}/admin/health/ready`,
};
