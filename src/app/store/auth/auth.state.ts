import { AccessModel } from '../../core/models/auth/auth.models';

export interface AuthState {
  accessModel: AccessModel | null;
  isLoading: boolean;
}

export const initialAuthState: AuthState = {
  accessModel: null,
  isLoading: false,
};
