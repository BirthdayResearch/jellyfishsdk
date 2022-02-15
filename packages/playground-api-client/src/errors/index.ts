import { PlaygroundApiException } from './api.error'
import { PlaygroundApiResponse } from '../playground.api.response'

export * from './api.error'
export * from './client.timeout.exception'

/**
 * @param {PlaygroundApiResponse} response to check and raise error if any
 * @throws {PlaygroundApiException} raised error
 */
export function raiseIfError (response: PlaygroundApiResponse<any>): void {
  const error = response.error
  if (error === undefined) {
    return
  }

  throw new PlaygroundApiException(error)
}
