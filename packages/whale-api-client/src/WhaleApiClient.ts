import { OceanApiClient } from '@defichain/ocean-api-client'
import 'url-search-params-polyfill'
import { version } from './Version'
import { Address } from './api/Address'
import { PoolPairs } from './api/PoolPairs'
import { Rpc } from './api/Rpc'
import { Transactions } from './api/Transactions'
import { Tokens } from './api/Tokens'
import { Masternodes } from './api/MasterNodes'
import { Blocks } from './api/Blocks'
import { Oracles } from './api/Oracles'
import { Prices } from './api/Prices'
import { Stats } from './api/Stats'
import { Rawtx } from './api/RawTx'
import { Fee } from './api/Fee'
import { Loan } from './api/Loan'

/**
 * WhaleApiClient Options
 */
export interface WhaleApiClientOptions {
  url: string

  /**
   * Millis before request is aborted.
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Version of API
   * `v{major}.{minor}` or `v{major}`
   */
  version?: string

  /**
   * Network that whale client is configured to
   */
  network?: 'mainnet' | 'testnet' | 'regtest' | string
}

export class WhaleApiClient extends OceanApiClient {
  public readonly rpc = new Rpc(this)
  public readonly address = new Address(this)
  public readonly poolpairs = new PoolPairs(this)
  public readonly transactions = new Transactions(this)
  public readonly tokens = new Tokens(this)
  public readonly masternodes = new Masternodes(this)
  public readonly blocks = new Blocks(this)
  public readonly oracles = new Oracles(this)
  public readonly prices = new Prices(this)
  public readonly stats = new Stats(this)
  public readonly rawtx = new Rawtx(this)
  public readonly fee = new Fee(this)
  public readonly loan = new Loan(this)

  constructor (options: WhaleApiClientOptions) {
    super({
      url: options.url,
      timeout: options.timeout ?? 60000,
      version: options.version ?? version,
      network: options.network ?? 'mainnet'
    })
  }
}
