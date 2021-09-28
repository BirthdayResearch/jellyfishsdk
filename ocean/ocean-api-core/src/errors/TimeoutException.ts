/**
 * Local client exception, due to local reason.
 */
export class TimeoutException extends Error {
  constructor (public readonly timeout: number) {
    super(`request aborted due to timeout of ${timeout} ms`)
  }
}
