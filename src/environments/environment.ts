const apiUrl = 'http://localhost:5000';

export const environment = {
  production: false,
  apiUrl,
  healthUrl: `${apiUrl}/admin/health/ready`,
};
