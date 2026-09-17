export interface PageParams {
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function toSkip({ page, pageSize }: PageParams): number {
  return (page - 1) * pageSize;
}
