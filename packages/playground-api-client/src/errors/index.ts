// import { ApiResponse, ApiException } from '../.'

import { ApiException } from './ApiException'
import { ApiResponse } from '../ApiResponse'

export * from '../errors'

/**
 * @param {ApiException} response to check and raise error if any
 * @throws {ApiException} raised error
 */
export function raiseIfError (response: ApiResponse<any>): void {
  const error = response.error
  if (error === undefined) {
    return
  }

  throw new ApiException(error)
}
