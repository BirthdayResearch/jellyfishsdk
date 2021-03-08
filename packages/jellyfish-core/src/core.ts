import BigNumber from 'bignumber.js'
import { Mining } from './category/mining'

export * from './category/mining'
export { BigNumber, Mining }

/**
 * JellyfishClient; a protocol agnostic DeFiChain node client, RPC calls are separated into their category.
 */
export abstract class JellyfishClient {
  public readonly mining = new Mining(this)

  /**
   * A promise based procedure call handling
   *
   * @param method name
   * @param params payload
   * @throws JellyfishError
   */
  abstract call<T> (method: string, params: any[]): Promise<T>
}

/**
 * JellyfishError; where jellyfish/defichain errors are encapsulated into.
 */
export class JellyfishError extends Error {
  readonly payload: any

  // TODO(fuxingloh): error.code
  // TODO(fuxingloh): error.message

  constructor (payload: any) {
    super('JellyfishError')
    this.payload = payload
  }
}
