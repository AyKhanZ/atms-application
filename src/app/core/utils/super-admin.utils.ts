import { Roles } from '../enums/roles.enum';

export function isSuperAdmin(roles: readonly { code: string }[]): boolean {
  return roles.some((role) => role.code === Roles.SuperAdmin);
}
