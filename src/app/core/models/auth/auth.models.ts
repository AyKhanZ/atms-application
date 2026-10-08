export interface AccessModel {
  accessToken: string;
  refreshToken: string;
  accessTokenExpireTime: string; // ISO date string
}

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

// 401 and 423 come as a plain message
export interface ApiErrorModel {
  status: 400 | 401 | 423 | 500;
  message: string;
  fieldErrors?: FieldErrorModel[]; // only for 400
}
