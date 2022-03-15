import { ApiClient, BigNumber, blockchain as defid } from '@defichain/jellyfish-api-core'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { QueueClient, Queue } from './lib/Queue'
import { SingleIndexDb, Schema } from './lib/SingleIndexDb'
import { AddressParser } from './saga/AddressParser'
import { NetworkName } from '@defichain/jellyfish-network'
import { AccountAmount } from '@defichain/jellyfish-api-core/src/category/account'
import { ActiveAddressAccountAmount } from './types'

const DEFAULT_RICH_LIST_LENGTH = 1000

export interface AddressBalance {
  address: string
  amount: number
}

export class RichListCore {
  isCatchingUp = false
  richListLength = DEFAULT_RICH_LIST_LENGTH
  readonly addressParser: AddressParser

  constructor (
    private readonly network: NetworkName,
    private readonly apiClient: ApiClient,
    private readonly whaleApiClient: WhaleApiClient,
    readonly addressBalances: SingleIndexDb<AddressBalance>,
    private readonly crawledBlockHashes: SingleIndexDb<CrawledBlock>,
    private readonly droppedFromRichList: SingleIndexDb<string>,
    readonly queueClient: QueueClient<string>
  ) {
    this.addressParser = new AddressParser(apiClient, network)
  }

  setRichListLength (length: number): void {
    this.richListLength = length
  }

  /**
   * Expected to be called on application bootstarapped.
   * Start sync-ing up rich list up to tip and stop.
   * Application layer should also consume this on interval basis to allow rich list updates again
   *
   * @returns {void}
   */
  start (): void {
    if (this.isCatchingUp) {
      return
    }
    this.isCatchingUp = true
    void this._catchUp()
  }

  private async _catchUp (): Promise<void> {
    const lastBlock = await this._getCrawledTip()
    const nextBlockHeight = lastBlock === undefined ? 0 : lastBlock.data.height + 1
    const nextBlock = await this._getBlock(nextBlockHeight)

    if (nextBlock === undefined) {
      this.isCatchingUp = false
      return
    }

    if (lastBlock !== undefined && lastBlock.data.hash !== nextBlock.previousblockhash) {
      await this._invalidate(lastBlock)
    } else {
      const queue = await this._addressQueue()
      const _addresses = await this._getAddresses(nextBlock)
      for (const a of _addresses) {
        await queue.push(a)
      }

      await this.crawledBlockHashes.put({
        partition: 'NONE',
        id: nextBlock.hash,
        sort: nextBlock.height,
        data: nextBlock
      })
    }

    return await this._catchUp()
  }

  private async _getAddresses (block: defid.Block<defid.Transaction>): Promise<string[]> {
    const _addresses = []
    for (const tx of block.tx) {
      const addresses = await this.addressParser.parse(tx)
      _addresses.push(...addresses)
    }
    return _addresses
  }

  private async _getBlock (height: number): Promise<defid.Block<defid.Transaction> | undefined> {
    try {
      const bh = await this.apiClient.blockchain.getBlockHash(height)
      return await this.apiClient.blockchain.getBlock(bh, 2)
    } catch (err: any) {
      if (err?.payload?.message === 'Block height out of range') {
        return undefined
      }
      throw err
    }
  }

  private async _invalidate (block: Schema<CrawledBlock>): Promise<void> {
    const tokenIds = await this._listTokenIds()
    // delete for this block height
    await this.crawledBlockHashes.delete(block.id)
    for (const tokenId of tokenIds) {
      await this._invalidateDroppedOutRichList(`${tokenId}`, block.data.height)
    }

    // find dropped out addresses to check their balance again
    if (block.data.height !== 0) {
      for (const tokenId of tokenIds) {
        const addresses = await this._getDroppedOutRichList(`${tokenId}`, block.data.height - 1)
        const queue = await this._addressQueue()
        for (const a of addresses) {
          await queue.push(a.data)
        }
      }
    }
  }

  async get (tokenId: string): Promise<AddressBalance[]> {
    if (Number.isNaN(tokenId)) {
      throw new Error('Invalid token id')
    }

    if (!(await this._listTokenIds()).includes(Number(tokenId))) {
      throw new Error('Invalid token id')
    }

    return (await this.addressBalances.list({
      partition: `${tokenId}`,
      limit: this.richListLength,
      order: 'DESC'
    })).map(s => s.data)
  }

  /**
   * Updated rich list with latest balance
   * by sorting the existing rich list together with `queuedAddressLimit` number of recently active addresses
   *
   * @param queuedAddressLimit [5000]
   */
  async calculateNext (queuedAddressLimit = 5000): Promise<void> {
    const tokens = await this._listTokenIds()
    let updatedBalances = await this._getActiveAddressBalances(tokens, queuedAddressLimit)

    while (Object.keys(updatedBalances).length > 0) {
      for (const address of Object.keys(updatedBalances)) {
        const accountAmount = updatedBalances[address]
        for (const tokenId of tokens) {
          const balance = accountAmount[tokenId].toNumber()
          const satoshi = accountAmount[tokenId].times('1e8').dividedToIntegerBy(1).toNumber()
          await this.addressBalances.put({
            partition: `${tokenId}`,
            sort: satoshi,
            id: `${address}-${tokenId}`,
            data: {
              address: address,
              amount: balance
            }
          })
        }
      }

      updatedBalances = await this._getActiveAddressBalances(tokens, queuedAddressLimit)
    }
  }

  private async _getActiveAddressBalances (tokens: number[], queuedAddressLimit: number): Promise<ActiveAddressAccountAmount> {
    const queue = await this._addressQueue()
    const addresses = await queue.receive(queuedAddressLimit)

    const balances: Record<string, AccountAmount> = {}
    for (const a of addresses) {
      const nonZeroBalances = await this.apiClient.account.getTokenBalances(
        { limit: Number.MAX_SAFE_INTEGER },
        true
      ) as any as AccountAmount
      balances[a] = this._appendZeroBalances(nonZeroBalances, tokens)
      // TBD: should be combine utxo and DFI rich list
      balances[a]['-1'] = new BigNumber(await this.whaleApiClient.address.getBalance(a))
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

  private async _getCrawledTip (): Promise<Schema<CrawledBlock> | undefined> {
    const [lastBlock] = await this.crawledBlockHashes.list({
      partition: 'NONE',
      order: 'DESC',
      limit: 1
    })
    return lastBlock
  }

  private async _invalidateDroppedOutRichList (tokenId: string, height: number): Promise<void> {
    const lastBlockRichList = await this._getDroppedOutRichList(tokenId, height)
    await Promise.all(
      lastBlockRichList.map(async rl => await this.droppedFromRichList.delete(rl.id))
    )
  }

  private async _getDroppedOutRichList (tokenId: string, height: number): Promise<Array<Schema<string>>> {
    return await this.droppedFromRichList.list({
      limit: Number.MAX_SAFE_INTEGER,
      partition: tokenId,
      order: 'DESC',
      gt: height - 1,
      lt: height + 1
    })
  }

  private async _listTokenIds (): Promise<number[]> {
    const tokens = await this.apiClient.token.listTokens()
    return Object.keys(tokens).map(id => Number(id)).concat([-1])
  }

  private async _addressQueue (): Promise<Queue<string>> {
    return await this.queueClient.createQueueIfNotExist('RichListCore_ACTIVE_ADDRESSES', 'LIFO')
  }
}

export interface CrawledBlock {
  height: number
  hash: string
}
