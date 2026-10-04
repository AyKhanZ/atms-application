export interface ResetPasswordCommand {
  password: string;
  confirmPassword: string;
  token: string;
}
