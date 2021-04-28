import { Precision, PrecisionPath } from '@defichain/jellyfish-json'
import { Blockchain } from './category/blockchain'
import { Mining } from './category/mining'
import { RawTx } from './category/rawtx'
import { Wallet } from './category/wallet'
import { PoolPair } from './category/poolpair'
import { Token } from './category/token'

export * from '@defichain/jellyfish-json'

export * as blockchain from './category/blockchain'
export * as mining from './category/mining'
export * as rawtx from './category/rawtx'
export * as wallet from './category/wallet'
export * as poolpair from './category/poolpair'
export * as token from './category/token'

/**
 * A protocol agnostic DeFiChain node client, RPC calls are separated into their category.
 */
export abstract class ApiClient {
  public readonly blockchain = new Blockchain(this)
  public readonly mining = new Mining(this)
  public readonly rawtx = new RawTx(this)
  public readonly wallet = new Wallet(this)
  public readonly poolpair = new PoolPair(this)
  public readonly token = new Token(this)

  /**
   * A promise based procedure call handling
   *
   * @param {string} method name of the RPC method
   * @param {any[]} params array of params as RPC payload
   * @param {Precision | PrecisionPath} precision
   * Numeric precision to parse RPC payload as 'lossless', 'bignumber' or 'number'.
   *
   * 'lossless' uses LosslessJSON that parses numeric values as LosslessNumber. With LosslessNumber, one can perform
   * regular numeric operations, and it will throw an error when this would result in losing information.
   *
   * 'bignumber' parse all numeric values as 'BigNumber' using bignumber.js library.
   *
   * 'number' parse all numeric values as 'Number' and precision will be loss if it exceeds IEEE-754 standard.
   *
   * 'PrecisionPath' path based precision mapping, specifying 'bignumber' will automatically map all Number in that
   * path as 'bignumber'. Otherwise, it will default to number, This applies deeply.
   *
   * @throws ApiError
   * @throws RpcApiError
   * @throws ClientApiError
   */
  abstract call<T> (method: string, params: any[], precision: Precision | PrecisionPath): Promise<T>
}

/**
 * DeFi Blockchain errors are encapsulated into ApiError.
 * @see ClientApiError
 * @see RpcApiError
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
