import { BigNumber, blockchain as defid } from '@defichain/jellyfish-api-core'
import { WhaleApiClient, WhaleRpcClient } from '@defichain/whale-api-client'
import { QueueClient, Queue } from './persistent/Queue'
import { SingleIndexDb, Schema } from './persistent/SingleIndexDb'
import { AddressParser } from './saga/AddressParser'
import { NetworkName } from '@defichain/jellyfish-network'
import { AccountAmount } from '@defichain/jellyfish-api-core/src/category/account'
import { AddressAccountAmount } from './types'

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
    private readonly whaleRpcClient: WhaleRpcClient,
    private readonly whaleApiClient: WhaleApiClient,
    readonly addressBalances: SingleIndexDb<AddressBalance>,
    private readonly crawledBlockHashes: SingleIndexDb<CrawledBlock>,
    private readonly crawledBlockAddresses: SingleIndexDb<string>,
    readonly queueClient: QueueClient<string>
  ) {
    this.addressParser = new AddressParser(whaleRpcClient, network)
  }

  setRichListLength (length: number): void {
    this.richListLength = length
  }

  /**
   * Expected to be called on application bootstrapped.
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
    void this.catchUp()
  }

  private async catchUp (): Promise<void> {
    const lastBlock = await this.getCrawledTip()
    const nextBlockHeight = lastBlock === undefined ? 0 : lastBlock.data.height + 1
    const nextBlock = await this.getBlock(nextBlockHeight)

    if (nextBlock === undefined) {
      this.isCatchingUp = false
      return
    }

    const isNotBestChain = lastBlock !== undefined && // any crawled history
      lastBlock.data.hash !== nextBlock.previousblockhash // is crawled on best chain right now

    if (isNotBestChain) {
      // testing syntax, CI do not recognize `lastBlock` not undefined and complaining
      await this.invalidate(lastBlock as Schema<CrawledBlock>)
    } else {
      const queue = await this.addressQueue()
      const _addresses = await this.getAddresses(nextBlock)
      for (const a of _addresses) {
        await queue.push(a)

        await this.crawledBlockAddresses.put({
          partition: `${nextBlock.height}`,
          sort: nextBlock.height,
          id: `${nextBlock.height}-${a}`,
          data: a
        })
      }

      await this.crawledBlockHashes.put({
        partition: 'NONE',
        id: nextBlock.hash,
        sort: nextBlock.height,
        data: nextBlock
      })
    }

    return await this.catchUp()
  }

  private async getAddresses (block: defid.Block<defid.Transaction>): Promise<string[]> {
    const _addresses = []
    for (const tx of block.tx) {
      const addresses = await this.addressParser.parse(tx)
      _addresses.push(...addresses)
    }
    return _addresses
  }

  private async getBlock (height: number): Promise<defid.Block<defid.Transaction> | undefined> {
    try {
      const bh = await this.whaleRpcClient.blockchain.getBlockHash(height)
      return await this.whaleRpcClient.blockchain.getBlock(bh, 2)
    } catch (err: any) {
      if (err?.payload?.message === 'Block height out of range') {
        return undefined
      }
      throw err
    }
  }

  private async invalidate (block: Schema<CrawledBlock>): Promise<void> {
    // delete for this block height
    await this.crawledBlockHashes.delete(block.id)

    // find dropped out addresses to check their balance again
    if (block.data.height !== 0) {
      const addresses = await this.getCrawledBlockAddresses(block.data.height)
      const queue = await this.addressQueue()
      for (const a of addresses) {
        await queue.push(a.data)
        await this.crawledBlockAddresses.delete(a.id)
      }
    }
  }

  async get (tokenId: string): Promise<AddressBalance[]> {
    if (Number.isNaN(tokenId)) {
      throw new Error('Invalid token id')
    }

    if (!(await this.listTokenIds()).includes(Number(tokenId))) {
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
    const tokens = await this.listTokenIds()
    let updatedBalances = await this.getActiveAddressBalances(tokens, queuedAddressLimit)

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

      updatedBalances = await this.getActiveAddressBalances(tokens, queuedAddressLimit)
    }
  }

  private async getActiveAddressBalances (tokens: number[], queuedAddressLimit: number): Promise<AddressAccountAmount> {
    const queue = await this.addressQueue()
    const addresses = await queue.receive(queuedAddressLimit)

    const balances: AddressAccountAmount = {}
    for (const a of addresses) {
      const nonZeroBalances = await this.whaleRpcClient.account.getAccount(
        a,
        { limit: Number.MAX_SAFE_INTEGER },
        { indexedAmounts: true }
      )
      balances[a] = this.appendZeroBalances(nonZeroBalances, tokens)
      // TBD: should be combine utxo and DFI rich list
      balances[a]['-1'] = new BigNumber(await this.whaleApiClient.address.getBalance(a))
    }
    return balances
  }

  private appendZeroBalances (tokenBalances: AccountAmount, tokens: number[]): AccountAmount {
    const result: AccountAmount = {}
    for (const t of tokens) {
      result[t] = tokenBalances[t] !== undefined ? new BigNumber(tokenBalances[t]) : new BigNumber(0)
    }
    return result
  }

  private async getCrawledTip (): Promise<Schema<CrawledBlock> | undefined> {
    const [lastBlock] = await this.crawledBlockHashes.list({
      partition: 'NONE',
      order: 'DESC',
      limit: 1
    })
    return lastBlock
  }

  private async getCrawledBlockAddresses (height: number): Promise<Array<Schema<string>>> {
    return await this.crawledBlockAddresses.list({
      limit: Number.MAX_SAFE_INTEGER,
      partition: `${height}`,
      order: 'DESC'
    })
  }

  private async listTokenIds (): Promise<number[]> {
    const tokens = await this.whaleRpcClient.token.listTokens()
    return Object.keys(tokens).map(id => Number(id)).concat([-1])
  }

  private async addressQueue (): Promise<Queue<string>> {
    return await this.queueClient.createQueueIfNotExist('RichListCore_ACTIVE_ADDRESSES', 'LIFO')
  }
}

export interface CrawledBlock {
  height: number
  hash: string
}
