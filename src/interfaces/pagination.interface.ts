export interface In_PaginationResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface In_PaginationParams {
  page: number;
  limit: number;
  sort?: string | undefined;
  order?: 'ASC' | 'DESC';
  search?: string;
  filters?: Record<string, any>;
}
