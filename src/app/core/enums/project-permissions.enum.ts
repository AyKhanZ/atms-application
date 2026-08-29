export const ProjectPermissions = {
  Project: {
    View: 'ProjectView',
    Edit: 'ProjectEdit',
    Delete: 'ProjectDelete',
  },
  Group: {
    View: 'GroupView',
    Edit: 'GroupEdit',
    Delete: 'GroupDelete',
  },
} as const;

type ProjectPermissionGroup = (typeof ProjectPermissions)[keyof typeof ProjectPermissions];
export type ProjectPermission = ProjectPermissionGroup[keyof ProjectPermissionGroup];
