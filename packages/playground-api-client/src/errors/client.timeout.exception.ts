/**
 * Local client exception, due to local reason.
 */
export class PlaygroundClientException extends Error {
}

/**
 * Playground client timeout locally.
 */
export class PlaygroundClientTimeoutException extends PlaygroundClientException {
  constructor (public readonly timeout: number) {
    super(`request aborted due to timeout of ${timeout} ms`)
  }
}
