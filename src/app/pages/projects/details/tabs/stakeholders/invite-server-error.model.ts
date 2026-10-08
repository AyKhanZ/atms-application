export type InviteField = 'email' | 'name' | 'surname';

export interface InviteServerError {
  field: InviteField;
  message: string;
}
