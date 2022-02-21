import { ApiClient } from '@defichain/jellyfish-api-core'
import { Mode, Queue, QueueClient } from './Queue'
import { PersistentStorage } from './PersistentStorage'

export type TokenPartition = string
export interface RichListAccountQuery {
  token: TokenPartition
  address: string
}

export interface RichListAccount {
  address: string
  amount: number
}

export class RichListCore {
  RICH_LIST_LENGTH = 1000

  constructor (
    private readonly apiClient: ApiClient,
    private readonly existingRichList: PersistentStorage<TokenPartition, RichListAccount[]>,
    private readonly queueClient: QueueClient<string>
  ) {}

  async bootstrap (): Promise<void> {
    // TODO: create tables
    // TODO: create queue
  }

  private _queueName (tokenId: string): string {
    return `RICH_LIST_TOKEN_${tokenId}`
  }

  async queueActiveAddress (tokenId: string, address: string): Promise<void> {
    // TODO: check queue exist, could be new token created after bootstrapped
    const q = await this.queueClient.createQueueIfNotExist(this._queueName(tokenId), 'LIFO')
    await q.push(address)
  }

  async refreshRichList (): Promise<void> {
    const tokens = await this._listTokens()
    for (const tokenId of tokens) {
      await this._refreshRichList(tokenId)
    }
  }

  async _refreshRichList (tokenId: TokenPartition): Promise<void> {
    // const existing = await this.existingRichList.get(tokenId)
    // const queue = await this.queueClient.createQueueIfNotExist(this._queueName(tokenId), 'LIFO')
    // const activeAddress = await queue.receive(10_000) // to limit maximum ram usage spike

    /**
     * TODO:
     * newRichList = existing.concat(active).map(addr => getBalance(addr)).sort()
     * store new list
     */
  }

  async _listTokens (): Promise<TokenPartition[]> {
    const tokens = await this.apiClient.token.listTokens()
    return Object.keys(tokens)
  }

  async get (token: string): Promise<RichListAccount[]> {
    return await this.existingRichList.get(token) ?? []
  }

  setRichListLength (length: number): void {
    this.RICH_LIST_LENGTH = length
  }

  static inMemory (apiClient: ApiClient): RichListCore {
    return new RichListCore(
      apiClient,
      new RichListKV(),
      new InMemoryQueueClient()
    )
  }
}

// in memory modules for test usage
abstract class InMemorySerializedStorage<K, V> implements PersistentStorage<K, V> {
  private readonly DATA: { [key: string]: V } = {}

  abstract serializeKey (k: K): string

  async get (key: K): Promise<V | undefined> {
    return this.DATA[this.serializeKey(key)]
  }

  async put (key: K, value: V): Promise<void> {
    this.DATA[this.serializeKey(key)] = value
  }

  async delete (key: K): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.DATA[this.serializeKey(key)]
  }
}

class RichListKV extends InMemorySerializedStorage<string, RichListAccount[]> {
  serializeKey (k: string): string {
    return k
  }
}

class InMemoryQueue implements Queue<string> {
  private DATA: string[] = []

  async push (message: string): Promise<string> {
    this.DATA.push(message)
    return `${this.DATA.length - 1}`
  }

  async receive (maxMessage: number): Promise<string[]> {
    const startIndex = Math.min(this.DATA.length - maxMessage, 0)
    const consumed = this.DATA.slice(startIndex)
    this.DATA = this.DATA.slice(0, startIndex)
    return consumed
  }
}

class InMemoryQueueClient implements QueueClient<string> {
  private readonly DATA: { [key: string]: Queue<string> } = {}

  getQueue (name: string): Queue<string> | undefined {
    return this.DATA[name]
  }

  async createQueueIfNotExist (name: string, mode: Mode): Promise<Queue<string>> {
    this.DATA[name] = new InMemoryQueue()
    return this.DATA[name]
  }
}
