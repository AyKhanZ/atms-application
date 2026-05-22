// ─── Responses (то что приходит с сервера) ────────────────────────────────────

export interface AccessModel {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireTime: string; // ISO date string
}

// ─── Errors ───────────────────────────────────────────────────────────────────

export interface ValidationErrorModel {
  message: string;
  errors: FieldErrorModel[];
}

export interface FieldErrorModel {
  field: string;
  error: string;
}

export interface ServerErrorModel {
  code: string;
  message: string;
}

// 401 | 423 приходят просто строкой message
export interface ApiErrorModel {
  status: 400 | 401 | 423 | 500;
  message: string;
  fieldErrors?: FieldErrorModel[]; // только для 400
}
