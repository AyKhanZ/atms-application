// so the login page can say why the user got there
export interface LoginNavigationState {
  passwordChanged?: boolean;
  resetSentTo?: string;
}
