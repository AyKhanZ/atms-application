export interface InvitedUserCommand {
  name: string;
  surname: string;
  email: string;
}

export interface SaveSecurityCommand {
  password: string;
  confirmPassword: string;
  version: number;
}
