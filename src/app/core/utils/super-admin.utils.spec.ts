import { Roles } from '../enums/roles.enum';
import { isSuperAdmin } from './super-admin.utils';

describe('isSuperAdmin', () => {
  it('is true when one of the roles is SuperAdmin', () => {
    expect(isSuperAdmin([{ code: 'Employee' }, { code: Roles.SuperAdmin }])).toBe(true);
  });

  it('is false for other roles and for no roles', () => {
    expect(isSuperAdmin([{ code: 'Employee' }])).toBe(false);
    expect(isSuperAdmin([])).toBe(false);
  });
});
