export interface ChangePasswordCommand {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
