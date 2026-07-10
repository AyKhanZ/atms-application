export const Roles = {
  SuperAdmin: 'SuperAdmin',
  Employee: 'Employee',
  Client: 'Client',
  ClientManager: 'Client Manager',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
