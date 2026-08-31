export const ProjectPermissions = {
  Project: {
    View: 'ProjectView',
    Edit: 'ProjectEdit',
  },
  Ticket: {
    Create: 'TicketCreate',
    Edit: 'TicketEdit',
    Delete: 'TicketDelete',
  },
  Participant: {
    Edit: 'ParticipantEdit',
    Delete: 'ParticipantDelete',
    InviteClient: 'ParticipantInviteClient',
    InviteEmployee: 'ParticipantInviteEmployee',
  },
} as const;

type Values<T> = T[keyof T];
export type ProjectPermission = Values<{
  [Group in keyof typeof ProjectPermissions]: Values<(typeof ProjectPermissions)[Group]>;
}>;
