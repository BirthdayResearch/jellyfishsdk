import { WhaleApiErrorType, WhaleApiException } from './WhaleApiException'
import { WhaleApiValidationException } from './WhaleApiValidationException'
import { WhaleApiResponse } from '../WhaleApiResponse'

export * from './WhaleApiException'
export * from './WhaleApiValidationException'
export * from './WhaleClientTimeoutException'

/**
 * @param {WhaleApiResponse} response to check and raise error if any
 * @throws {WhaleApiException} raised error
 */
export function raiseIfError (response: WhaleApiResponse<any>): void {
  const error = response.error
  if (error === undefined) {
    return
  }

  if (error.code === 422 && error.type === WhaleApiErrorType.ValidationError) {
    throw new WhaleApiValidationException(error)
  }

  throw new WhaleApiException(error)
}
