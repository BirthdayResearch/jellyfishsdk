/**
 * Local client exception, due to local reason.
 */
export class WhaleClientException extends Error {
}

/**
 * Whale client timeout locally.
 */
export class WhaleClientTimeoutException extends WhaleClientException {
  constructor (public readonly timeout: number) {
    super(`request aborted due to timeout of ${timeout} ms`)
  }
}
