export interface CreateOrganizationCommand {
  title: string;
  voen: string;
  logo?: File | null;
}