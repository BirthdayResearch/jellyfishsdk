import BigNumber from 'bignumber.js'
import { Mining } from './category/mining'

// TODO(fuxingloh): might need to restructure how it's exported as this grows, will look into this soon
export * from './category/mining'
export { BigNumber }

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
  public readonly code: number
  public readonly rawMessage: string

  constructor (error: { code: number, message: string }) {
    super(`JellyfishError from RPC: '${error.message}', code: ${error.code}`)
    this.code = error.code
    this.rawMessage = error.message
  }
}
