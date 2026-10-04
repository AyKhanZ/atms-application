export interface KeysetPageModel<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
