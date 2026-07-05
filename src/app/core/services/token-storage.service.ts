import { Injectable } from '@angular/core';
import { AccessModel } from '../models/auth/auth.models';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const EXPIRES_AT_KEY = 'tokenExpireTime';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  getAccessModel(): AccessModel | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const accessTokenExpireTime = localStorage.getItem(EXPIRES_AT_KEY);

    if (!accessToken || !refreshToken || !accessTokenExpireTime) {
      return null;
    }

    return { accessToken, refreshToken, accessTokenExpireTime };
  }

  save(accessModel: AccessModel): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessModel.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, accessModel.refreshToken);
    localStorage.setItem(EXPIRES_AT_KEY, accessModel.accessTokenExpireTime);
  }

  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  }
}
