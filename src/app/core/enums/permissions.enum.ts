export const Permissions = {
  User: {
    View: 'UserView',
    Edit: 'UserEdit',
    Delete: 'UserDelete',
  },
  Organization: {
    View: 'OrganizationView',
    Edit: 'OrganizationEdit',
    Delete: 'OrganizationDelete',
  },
  Role: {
    View: 'RoleView',
    Edit: 'RoleEdit',
    Delete: 'RoleDelete',
  },
  Project: {
    View: 'ProjectView',
    Edit: 'ProjectEdit',
  },
  Comment: {
    View: 'CommentView',
    Edit: 'CommentEdit',
    Delete: 'CommentDelete',
  },
  Notification: {
    View: 'NotificationView',
    Edit: 'NotificationEdit',
    Delete: 'NotificationDelete',
  },
} as const;

type PermissionGroup = (typeof Permissions)[keyof typeof Permissions];
export type Permission = PermissionGroup[keyof PermissionGroup];
