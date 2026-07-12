export interface UpdateOrganizationCommand {
  id: string;
  title: string;
  voen: string;
  logo?: File | null;
}