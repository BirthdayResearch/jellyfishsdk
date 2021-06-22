import { ExecutionContext } from '@nestjs/common'

const VERSION: 'v0' = 'v0'

/**
 * @param {ExecutionContext} context to check if path is version prefixed
 * @return {boolean}
 */
export function isVersionPrefixed (context: ExecutionContext): boolean {
  const request = context.switchToHttp().getRequest()
  const url: string = request.raw?.url
  return url.startsWith(`/${VERSION}/`)
}
