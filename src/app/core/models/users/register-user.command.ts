export interface RegisterUserCommand {
  name: string;
  surname: string;
  email: string;
  roleId: string;
  organizationId?: string | null;
}
