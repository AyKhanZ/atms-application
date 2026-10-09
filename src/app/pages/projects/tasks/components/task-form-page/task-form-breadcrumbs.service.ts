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

  // subtask uses the task route ("New task"), fix the crumb up front instead of showing it wrong for a moment
  placeholder(isSubtask: boolean): void {
    this.breadcrumbs.set(this.ownerPath, isSubtask ? 'tasks.newSubtask' : 'tasks.new');
  }

  show(
    project: WorkProjectModel,
    parent: TaskParentOption | null,
    task: WorkTaskModel | null,
  ): void {
    const projectPath = '/projects/' + project.id;
    const items: BreadcrumbItem[] = [
      { title: 'nav.projects', path: '/projects', icon: 'pi-briefcase' },
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
          title: parent?.kind === 'task' ? 'tasks.newSubtask' : 'tasks.new',
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
