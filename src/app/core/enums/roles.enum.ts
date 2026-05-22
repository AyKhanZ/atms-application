export const Roles = {
  SuperAdmin: 'Super Admin',
  Agent: 'Agent',
  Client: 'Client',
  SuperManager: 'Client Manager',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
