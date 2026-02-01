export interface In_ApiResponseMeta {
  timestamp: string;
  path?: string;
  method?: string;
  totalPages?: number;
  [key: string]: any;
}

export interface In_ApiResponseStructure<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  meta: In_ApiResponseMeta;
}
