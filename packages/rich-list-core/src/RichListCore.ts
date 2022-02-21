import { ApiClient } from '@defichain/jellyfish-api-core'
import { QueueClient } from './lib/Queue'
import { PersistentStorage } from './lib/PersistentStorage'
import { AddressParser } from './controller/AddressParser'
import { NetworkName } from '@defichain/jellyfish-network'
import { RichListItem } from '@defichain/rich-list-api-client'

export class RichListCore {
  CATCHING_UP = false
  RICH_LIST_LENGTH = 1000
  readonly addressParser: AddressParser

  constructor (
    private readonly network: NetworkName,
    private readonly apiClient: ApiClient,
    private readonly existingRichList: PersistentStorage<number, RichListItem[]>,
    private readonly queueClient: QueueClient<string>
  ) {
    this.addressParser = new AddressParser(apiClient, network)
  }

  private _queueName (tokenId: string): string {
    return `RICH_LIST_TOKEN_${tokenId}`
  }

  async queueActiveAddress (tokenId: string, address: string): Promise<void> {
    const queue = await this.queueClient.createQueueIfNotExist(this._queueName(tokenId), 'LIFO')
    await queue.push(address)
  }

  bootstrap (): void {
    this.CATCHING_UP = true

    /**
     * TODO:
     * 1. start/resume crawling block
     * 2. push active addresses into queue
     * 3. store crawled block hash
     */
  }

  async calculateNext (): Promise<void> {
    const tokens = await this._listTokens()
    for (const tokenId of tokens) {
      await this._calculateNext(tokenId)
    }
  }

  async _calculateNext (tokenId: number): Promise<void> {
    // const existing = await this.existingRichList.get(tokenId)
    // const queue = await this.queueClient.createQueueIfNotExist(this._queueName(tokenId), 'LIFO')
    // const activeAddress = await queue.receive(10_000) // to limit maximum ram usage spike

    /**
     * TODO:
     * newRichList = existing.concat(active).map(addr => getBalance(addr)).sort()
     * store new list
     */
  }

  private async _listTokens (): Promise<number[]> {
    const tokens = await this.apiClient.token.listTokens()
    return Object.keys(tokens).map(id => Number(id))
  }

  async get (token: string): Promise<RichListItem[]> {
    if (Number.isNaN(token)) {
      throw new Error('Invalid token id')
    }

    if (!(await this._listTokens()).includes(Number(token))) {
      throw new Error('Invalid token id')
    }

    return await this.existingRichList.get(Number(token)) ?? []
  }

  setRichListLength (length: number): void {
    this.RICH_LIST_LENGTH = length
  }
}
