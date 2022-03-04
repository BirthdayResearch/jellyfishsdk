import { OceanApiClient } from '@defichain/ocean-api-client'
import { Rpc } from './apis/Rpc'
import { Playground } from './apis/Playground'
import { Wallet } from './apis/Wallet'

export type Method = 'POST' | 'GET'

/**
 * PlaygroundApiClient Options
 */
export interface PlaygroundApiClientOptions {
  url: string

  /**
   * Millis before request is aborted.
   * @default 60000 ms
   */
  timeout?: number

  /**
   * Version of API
   */
  version?: 'v0'
}

/**
 * PlaygroundApiClient
 */
export class PlaygroundApiClient extends OceanApiClient {
  public readonly wallet = new Wallet(this)
  public readonly rpc = new Rpc(this)
  public readonly playground = new Playground(this)

  constructor (options: PlaygroundApiClientOptions) {
    super({
      url: options.url,
      timeout: options.timeout ?? 60000,
      version: options.version ?? 'v0',
      network: 'playground'
    })
  }
}
