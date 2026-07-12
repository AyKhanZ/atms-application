import { Injectable } from '@angular/core';
import { Params } from '@angular/router';
import { SortDirectionEnum } from '../../../../../core/enums/sort-direction.enum';
import {
  createDefaultUserListFilter,
  UserListFilter,
} from '../../../../../core/models/users/users.models';

@Injectable()
export class UsersListQueryService {
  private readonly defaultFilter = createDefaultUserListFilter();
  private readonly sortFields = new Set([
    'name',
    'surname',
    'email',
    'position',
    'userStatus',
    'createdAt',
  ]);

  fromParams(params: Params): UserListFilter {
    return {
      page: this.readNumber(params['page'], this.defaultFilter.page),
      pageSize: this.readNumber(params['pageSize'], this.defaultFilter.pageSize),
      sortBy: this.readSortBy(params['sortBy']),
      sortDirection: this.readSortDirection(params['sortDirection'], this.defaultFilter.sortDirection),
      search: this.readString(params['search']),
      userStatusId: this.readOptionalNumber(params['userStatusId']),
      createdFrom: this.readString(params['createdFrom']),
      createdTo: this.readString(params['createdTo']),
    };
  }

  toParams(filter: UserListFilter): Params {
    return Object.fromEntries(
      Object.entries({
        page: filter.page,
        pageSize: filter.pageSize,
        sortBy: filter.sortBy,
        sortDirection: filter.sortDirection,
        search: filter.search,
        userStatusId: filter.userStatusId,
        createdFrom: filter.createdFrom,
        createdTo: filter.createdTo,
      }).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );
  }

  hasAdvancedFilters(filter: UserListFilter): boolean {
    return this.filterValues(filter).some((value) => this.hasValue(value));
  }

  activeFilterCount(filter: UserListFilter): number {
    return this.filterValues(filter).filter((value) => this.hasValue(value)).length;
  }

  clean(value: string): string | undefined {
    return value.trim() || undefined;
  }

  private readSortBy(value: unknown): string {
    const sortBy = String(value ?? this.defaultFilter.sortBy);
    return this.sortFields.has(sortBy) ? sortBy : this.defaultFilter.sortBy;
  }

  private readNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private readSortDirection(value: unknown, fallback: SortDirectionEnum): SortDirectionEnum {
    const parsed = Number(value);
    return parsed === SortDirectionEnum.Asc || parsed === SortDirectionEnum.Desc ? parsed : fallback;
  }

  private readOptionalNumber(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private readString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private filterValues(filter: UserListFilter): unknown[] {
    return [filter.userStatusId, filter.createdFrom, filter.createdTo];
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
  }
}