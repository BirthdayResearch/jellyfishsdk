import { Precision, PrecisionMapping } from '@defichain/jellyfish-json'
import { Blockchain } from './category/blockchain'
import { Mining } from './category/mining'
import { Wallet } from './category/wallet'
import { PoolPair } from './category/pool_pair'

export * from '@defichain/jellyfish-json'
export * from './category/blockchain'
export * from './category/mining'
export * from './category/wallet'
export * from './category/pool_pair'

/**
 * ApiClient; a protocol agnostic DeFiChain node client, RPC calls are separated into their category.
 */
export abstract class ApiClient {
  public readonly blockchain = new Blockchain(this)
  public readonly mining = new Mining(this)
  public readonly wallet = new Wallet(this)
  public readonly poolPair = new PoolPair(this)

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
   * @throws ApiError
   * @throws RpcApiError
   * @throws ClientApiError
   */
  abstract call<T> (method: string, params: any[], precision: Precision | PrecisionMapping): Promise<T>
}

/**
 * ApiError; where defichain errors are encapsulated into.
 */
export class ApiError extends Error {
}

/**
 * Api client side error, from user.
 */
export class ClientApiError extends ApiError {
  constructor (message: string) {
    super(`ClientApiError: ${message}`)
  }
}

/**
 * API RPC error, from upstream.
 */
export class RpcApiError extends ApiError {
  public readonly payload: { code: number, message: string }

  constructor (error: { code: number, message: string }) {
    super(`RpcApiError: '${error.message}', code: ${error.code}`)
    this.payload = error
  }
}
