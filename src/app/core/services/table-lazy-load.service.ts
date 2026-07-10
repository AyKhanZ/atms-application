import { Injectable } from '@angular/core';
import { TableLazyLoadEvent } from 'primeng/table';
import { SortDirectionEnum } from '../enums/sort-direction.enum';
import { PaginatedFilter } from '../models/paginated.model';

@Injectable({ providedIn: 'root' })
export class TableLazyLoadService {
  toFilter<TFilter extends PaginatedFilter>(
    event: TableLazyLoadEvent,
    currentFilter: TFilter,
  ): TFilter {
    const pageSize = event.rows ?? currentFilter.pageSize;
    const page = Math.floor((event.first ?? 0) / pageSize) + 1;
    const sortBy = Array.isArray(event.sortField)
      ? event.sortField[0]
      : event.sortField || currentFilter.sortBy;

    return {
      ...currentFilter,
      page,
      pageSize,
      sortBy,
      sortDirection: this.toApiSortDirection(event.sortOrder, currentFilter.sortDirection),
    };
  }

  private toApiSortDirection(
    primeSortOrder: number | null | undefined,
    fallback: SortDirectionEnum,
  ): SortDirectionEnum {
    if (primeSortOrder === 1) return SortDirectionEnum.Asc;
    if (primeSortOrder === -1) return SortDirectionEnum.Desc;
    return fallback;
  }
}
