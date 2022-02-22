import { ApiClient, BigNumber } from '@defichain/jellyfish-api-core'
import { QueueClient } from './lib/Queue'
import { PersistentStorage } from './lib/PersistentStorage'
import { AddressParser } from './controller/AddressParser'
import { NetworkName } from '@defichain/jellyfish-network'
import { RichListItem } from '@defichain/rich-list-api-client'
import { AccountAmount } from 'packages/jellyfish-api-core/src/category/account'
import { ActiveAddressAccountAmount } from './controller/AddressParser/ActiveAddressAccountAmount'

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

  setRichListLength (length: number): void {
    this.RICH_LIST_LENGTH = length
  }

  bootstrap (): void {
    this.CATCHING_UP = true

    /**
     * TODO:
     * 1. start/resume crawling block
     * 2. push active addresses into queue
     * 3. store crawled block hash
     * 4. hit chain tip, CATHING_UP = false
     */
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

  /**
   * Updated rich list with latest balance
   * by sorting the existing rich list together with `queuedAddressLimit` number of recently active addresses
   *
   * @param queuedAddressLimit [5000]
   */
  async calculateNext (queuedAddressLimit = 5000): Promise<void> {
    const tokens = await this._listTokens()
    let updatedBalances = await this._getActiveAddressBalances(tokens, queuedAddressLimit)

    while (Object.keys(updatedBalances).length > 0) {
      for (const tokenId of tokens) {
        const updated = await this._computeRichList(tokenId, updatedBalances)
        await this.existingRichList.put(tokenId, updated)
      }

      updatedBalances = await this._getActiveAddressBalances(tokens, queuedAddressLimit)
    }
  }

  async _calculateNext (tokens: number[], updatedBalances: ActiveAddressAccountAmount): Promise<void> {
    for (const tokenId of tokens) {
      const updated = await this._computeRichList(tokenId, updatedBalances)
      await this.existingRichList.put(tokenId, updated)
    }
  }

  async _computeRichList (tokenId: number, activeAddressBalances: ActiveAddressAccountAmount): Promise<RichListItem[]> {
    const latestBalances: RichListItem[] = Object.keys(activeAddressBalances).map(address => ({
      address: address,
      amount: activeAddressBalances[address][tokenId].toNumber()
    }))
    const existing = (await this.existingRichList.get(tokenId)) ?? []
    return existing
      .filter(rl => !latestBalances.map(rl => rl.address).includes(rl.address))
      .concat(latestBalances)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, this.RICH_LIST_LENGTH)
  }

  private async _getActiveAddressBalances (tokens: number[], queuedAddressLimit: number): Promise<ActiveAddressAccountAmount> {
    const queue = await this.queueClient.createQueueIfNotExist(this._queueName(), 'LIFO')
    const addresses = await queue.receive(queuedAddressLimit)

    const balances: { [key: string]: AccountAmount } = {}
    for (const a of addresses) {
      const nonZeroBalances = await this.apiClient.account.getTokenBalances(
        { limit: Number.MAX_SAFE_INTEGER },
        true
      ) as any as AccountAmount
      balances[a] = this._appendZeroBalances(nonZeroBalances, tokens)
    }
    return balances
  }

  private _appendZeroBalances (tokenBalances: AccountAmount, tokens: number[]): AccountAmount {
    const result: AccountAmount = {}
    for (const t of tokens) {
      result[t] = tokenBalances[t] ?? new BigNumber(0)
    }
    return result
  }

  private async _listTokens (): Promise<number[]> {
    const tokens = await this.apiClient.token.listTokens()
    return Object.keys(tokens).map(id => Number(id))
  }

  private _queueName (): string {
    return 'RichListCore_ACTIVE_ADDRESSES'
  }
}
