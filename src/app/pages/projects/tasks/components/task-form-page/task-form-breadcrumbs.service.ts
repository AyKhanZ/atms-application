import { Injectable, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbItem } from '../../../../../core/models/breadcrumb-item.model';
import { WorkProjectModel } from '../../../../../core/models/work-projects';
import { WorkTaskModel } from '../../../../../core/models/work-tasks';
import { BreadcrumbOverrideService } from '../../../../../core/services/breadcrumb-override.service';
import { TaskParentOption } from '../task-parent-select/task-parent-option';

@Injectable()
export class TaskFormBreadcrumbsService implements OnDestroy {
  private readonly breadcrumbs = inject(BreadcrumbOverrideService);
  private readonly router = inject(Router);
  private readonly ownerPath = this.router.url.split(/[?#]/)[0];

  /**
   * A subtask is created on the same route as a task, whose static crumb reads "New task". Until
   * the form data lands there is nothing else to go on, so the crumb is corrected up front rather
   * than being briefly wrong.
   */
  placeholder(isSubtask: boolean): void {
    this.breadcrumbs.set(this.ownerPath, isSubtask ? 'New subtask' : 'New task');
  }

  show(
    project: WorkProjectModel,
    parent: TaskParentOption | null,
    task: WorkTaskModel | null,
  ): void {
    const projectPath = '/projects/' + project.id;
    const items: BreadcrumbItem[] = [
      { title: 'Projects', path: '/projects', icon: 'pi-briefcase' },
      { title: '#' + project.code + ' ' + project.title, path: projectPath },
    ];
    const ticketId = task?.workTicket.id ?? parent?.ticketId;
    if (ticketId) {
      const ticketPath = projectPath + '/tickets/' + ticketId;
      items.push({
        title:
          '#' +
          (task?.workTicket.code ?? parent?.ticketCode) +
          ' ' +
          (task?.workTicket.name ?? parent?.ticketTitle),
        path: ticketPath,
      });
      if (task) {
        if (task.parentWorkTask?.id) {
          items.push({
            title: '#' + task.parentWorkTask?.code + ' ' + task.parentWorkTask?.name,
            path: ticketPath + '/tasks/' + task.parentWorkTask?.id,
          });
        }
        items.push({
          title: '#' + task.code + ' ' + task.title,
          path: ticketPath + '/tasks/' + task.id,
        });
      } else {
        if (parent?.kind === 'task') {
          items.push({
            title: '#' + parent.code + ' ' + parent.title,
            path: ticketPath + '/tasks/' + parent.id,
          });
        }
        items.push({
          title: parent?.kind === 'task' ? 'New subtask' : 'New task',
          path: this.ownerPath,
        });
      }
    }
    this.breadcrumbs.setTrail(this.ownerPath, items);
  }

  ngOnDestroy(): void {
    this.breadcrumbs.clearTrail(this.ownerPath);
    this.breadcrumbs.clear(this.ownerPath);
  }
}
