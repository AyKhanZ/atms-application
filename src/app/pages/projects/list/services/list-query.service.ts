import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { SortDirectionEnum } from '../../../../core/enums/sort-direction.enum';
import {
  createDefaultWorkProjectListFilter,
  WorkProjectListFilter,
} from '../../../../core/models/work-projects';

@Injectable()
export class ProjectListQueryService {
  private readonly defaults = createDefaultWorkProjectListFilter();
  private readonly sortFields = new Set(['code', 'title', 'startDate', 'endDate', 'createdAt']);

  fromParams(params: Params): WorkProjectListFilter {
    return {
      page: this.number(params['page'], this.defaults.page),
      pageSize: this.number(params['pageSize'], this.defaults.pageSize),
      sortBy: this.sortBy(params['sortBy']),
      sortDirection: this.sortDirection(params['sortDirection']),
      search: this.text(params['search']),
      startDate: this.text(params['startDate']),
      endDate: this.text(params['endDate']),
      projectTypeId: this.optionalNumber(params['projectTypeId']),
      projectKindId: this.optionalNumber(params['projectKindId']),
      projectStatusId: this.optionalNumber(params['projectStatusId']),
    };
  }

  toParams(filter: WorkProjectListFilter): Params {
    return Object.fromEntries(
      Object.entries(filter).filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      ),
    );
  }

  activeFilterCount(filter: WorkProjectListFilter): number {
    return [
      filter.startDate,
      filter.endDate,
      filter.projectTypeId,
      filter.projectKindId,
      filter.projectStatusId,
    ].filter((value) => value !== undefined && value !== null && value !== '').length;
  }

  hasAdvancedFilters(filter: WorkProjectListFilter): boolean {
    return this.activeFilterCount(filter) > 0;
  }

  clean(value: string): string | undefined {
    return value.trim() || undefined;
  }

  private text(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private number(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private optionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private sortBy(value: unknown): string {
    const field = String(value ?? this.defaults.sortBy);
    return this.sortFields.has(field) ? field : this.defaults.sortBy;
  }

  private sortDirection(value: unknown): SortDirectionEnum {
    const parsed = Number(value);
    return parsed === SortDirectionEnum.Asc || parsed === SortDirectionEnum.Desc
      ? parsed
      : this.defaults.sortDirection;
  }
}
