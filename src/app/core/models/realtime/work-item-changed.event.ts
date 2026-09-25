export interface WorkItemChangedEvent {
  projectId: string;
  entityType: 'ticket' | 'task';
  id: string;
  action: 'created' | 'updated' | 'deleted';
}
