import { Pipe, PipeTransform } from '@angular/core';
import { WorkItemRefModel } from '../../core/models/work-items';
import { workItemRoute } from '../../core/utils/work-item-route.utils';

@Pipe({ name: 'workItemRoute' })
export class WorkItemRoutePipe implements PipeTransform {
  transform(ref: WorkItemRefModel): string[] {
    return workItemRoute(ref);
  }
}
