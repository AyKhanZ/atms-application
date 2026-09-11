import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { DictionaryModel } from '../../../../../core/models/dictionary.model';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { WorkTicketModel } from '../../../../../core/models/work-tickets';
import { DictionaryService } from '../../../../../core/services/dictionary.service';
import { WorkProjectsService } from '../../../../../core/services/work-projects.service';
import { WorkTasksService } from '../../../../../core/services/work-tasks.service';
import { WorkTicketsService } from '../../../../../core/services/work-tickets.service';

export interface TaskFormContext {
  project: WorkProjectModel;
  priorities: DictionaryModel[];
  statuses: DictionaryModel[];
  task: WorkTaskModel | null;
  ticket: WorkTicketModel | null;
}

@Injectable()
export class TaskFormContextService {
  private readonly projects = inject(WorkProjectsService);
  private readonly tasks = inject(WorkTasksService);
  private readonly tickets = inject(WorkTicketsService);
  private readonly dictionaries = inject(DictionaryService);

  load(
    projectId: string,
    ticketId: string,
    taskId: string | null,
    parentTaskId: string | null,
  ): Observable<TaskFormContext> {
    const contextTaskId = taskId ?? parentTaskId;

    return forkJoin({
      project: this.projects.getProject(projectId),
      priorities: this.dictionaries.getWorkItemPriorityDictionaries(),
      statuses: taskId ? this.dictionaries.getWorkTaskStatusDictionaries() : of([]),
      task: contextTaskId ? this.tasks.getWorkTask(projectId, contextTaskId) : of(null),
      ticket: contextTaskId ? of(null) : this.tickets.getWorkTicket(projectId, ticketId),
    });
  }
}
