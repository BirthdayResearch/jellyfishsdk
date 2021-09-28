/**
 * Local client exception
 */
export class ClientException extends Error {
  constructor (public readonly message: string) {
    super(message)
  }
}
