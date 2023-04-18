import { Precision, PrecisionPath } from '@defichain/jellyfish-json'
import { Blockchain } from './category/blockchain'
import { Mining } from './category/mining'
import { Net } from './category/net'
import { RawTx } from './category/rawtx'
import { Wallet } from './category/wallet'
import { Account } from './category/account'
import { PoolPair } from './category/poolpair'
import { Token } from './category/token'
import { Oracle } from './category/oracle'
import { Server } from './category/server'
import { Masternode } from './category/masternode'
import { ICXOrderBook } from './category/icxorderbook'
import { Governance } from './category/governance'
import { Spv } from './category/spv'
import { Misc } from './category/misc'
import { Loan } from './category/loan'
import { Vault } from './category/vault'
import { Evm } from './category/evm'

export * from '@defichain/jellyfish-json'

export * as blockchain from './category/blockchain'
export * as mining from './category/mining'
export * as net from './category/net'
export * as rawtx from './category/rawtx'
export * as wallet from './category/wallet'
export * as poolpair from './category/poolpair'
export * as token from './category/token'
export * as account from './category/account'
export * as oracle from './category/oracle'
export * as server from './category/server'
export * as masternode from './category/masternode'
export * as governance from './category/governance'
export * as spv from './category/spv'
export * as icxorderbook from './category/icxorderbook'
export * as misc from './category/misc'
export * as loan from './category/loan'
export * as evm from './category/evm'

/**
 * A protocol agnostic DeFiChain node client, RPC calls are separated into their category.
 */
export abstract class ApiClient {
  public readonly blockchain = new Blockchain(this)
  public readonly mining = new Mining(this)
  public readonly net = new Net(this)
  public readonly rawtx = new RawTx(this)
  public readonly wallet = new Wallet(this)
  public readonly account = new Account(this)
  public readonly poolpair = new PoolPair(this)
  public readonly token = new Token(this)
  public readonly oracle = new Oracle(this)
  public readonly server = new Server(this)
  public readonly masternode = new Masternode(this)
  public readonly icxorderbook = new ICXOrderBook(this)
  public readonly governance = new Governance(this)
  public readonly spv = new Spv(this)
  public readonly misc = new Misc(this)
  public readonly loan = new Loan(this)
  public readonly vault = new Vault(this)
  public readonly evm = new Evm(this)

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
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
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
  public readonly payload: { code: number, message: string, method: string }

  constructor (error: { code: number, message: string, method: string }) {
    super(`RpcApiError: '${error.message}', code: ${error.code}, method: ${error.method}`)
    this.payload = error
  }
}
