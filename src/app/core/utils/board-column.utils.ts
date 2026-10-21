import { WorkTaskStatus } from '../enums/work-task-status.enum';

// the dot uses the status color; a column has no color of its own
export function boardColumnStatusCode(category: number): string {
  switch (category) {
    case WorkTaskStatus.InProgress:
      return 'InProgress';
    case WorkTaskStatus.Done:
      return 'Done';
    default:
      return 'New';
  }
}
