export interface ResponseListInterface<T> {
  list: T[];
  pageNumber: number;
  totalItems: number;
  totalPages: number;
}
