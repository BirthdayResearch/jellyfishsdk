import { ApiException, ApiErrorType } from './ApiException'

export class BadRequestApiException extends ApiException {
  constructor (message?: string) {
    super({
      code: 400,
      type: ApiErrorType.BadRequest,
      at: Date.now(),
      message: message
    })
  }
}
