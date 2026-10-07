export type InviteField = 'email' | 'name' | 'surname';

/** What the server refused in an invitation and under which field to show it. */
export interface InviteServerError {
  field: InviteField;
  message: string;
}
