export enum ApiErrorType {
  ValidationError = 'ValidationError',
  BadRequest = 'BadRequest',
  NotFound = 'NotFound',
  Conflict = 'Conflict',
  Forbidden = 'Forbidden',
  Unauthorized = 'Unauthorized',
  BadGateway = 'BadGateway',
  TimeoutError = 'TimeoutError',
  UnknownError = 'UnknownError',
}

export interface ApiError {
  code: number
  type: ApiErrorType
  at: number
  message?: string
  url?: string
}
