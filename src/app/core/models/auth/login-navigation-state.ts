/** What a page passes to /login in navigation state, so the login screen can say why the user is there. */
export interface LoginNavigationState {
  passwordChanged?: boolean;
  resetSentTo?: string;
}
