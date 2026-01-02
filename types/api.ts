export interface PaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}

export interface MessageResponse {
  message: string;
}

export interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}
