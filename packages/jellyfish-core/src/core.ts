import { Mining } from './category/mining'
import { Wallet } from './category/wallet'
import { Precision } from './json'

export * from './category/mining'
export * from './category/wallet'
export * from './json'

/**
 * JellyfishClient; a protocol agnostic DeFiChain node client, RPC calls are separated into their category.
 */
export abstract class JellyfishClient {
  public readonly mining = new Mining(this)
  public readonly wallet = new Wallet(this)

  /**
   * A promise based procedure call handling
   *
   * @param method Name of the RPC method
   * @param params Array of params as RPC payload
   * @param precision
   * Numeric precision to parse RPC payload as 'lossless', 'bignumber' or 'number'.
   *
   * 'lossless' uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
   * regular numeric operations, and it will throw an error when this would result in losing information.
   *
   * 'bignumber' parse all numeric values as 'BigNumber' using bignumber.js library.
   *
   * 'number' parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
   *
   * @throws JellyfishError
   * @throws JellyfishRPCError
   * @throws JellyfishClientError
   */
  abstract call<T> (method: string, params: any[], precision: Precision): Promise<T>
}

/**
 * JellyfishError; where jellyfish/defichain errors are encapsulated into.
 */
export class JellyfishError extends Error {
}

/**
 * Jellyfish client side error, from user.
 */
export class JellyfishClientError extends JellyfishError {
  constructor (message: string) {
    super(`JellyfishClientError: ${message}`)
  }
}

/**
 * Jellyfish RPC error, from upstream.
 */
export class JellyfishRPCError extends JellyfishError {
  public readonly payload: { code: number, message: string }

  constructor (error: { code: number, message: string }) {
    super(`JellyfishRPCError: '${error.message}', code: ${error.code}`)
    this.payload = error
  }
}
