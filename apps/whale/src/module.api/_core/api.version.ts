import { ExecutionContext } from '@nestjs/common'

/**
 * @param {ExecutionContext} context to check if path is version prefixed
 * @return {boolean}
 * @deprecated use abstraction instead
 */
export function isVersionPrefixed (context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest()
  const url: string = request.raw?.url
  return url.startsWith('/v')
}
