import { Model, ModelMapping } from '@src/module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '@src/module.database/database'

const VaultAuctionHistoryMapping: ModelMapping<VaultAuctionBatchHistory> = {
  type: 'vault_auction_history',
  index: {
    vault_auction_history_key_sort: {
      name: 'vault_auction_history_key_sort',
      partition: {
        type: 'string',
        key: (vah: VaultAuctionBatchHistory) => vah.key
      },
      sort: {
        type: 'string',
        key: (vah: VaultAuctionBatchHistory) => vah.sort
      }
    }
  }
}

@Injectable()
export class VaultAuctionHistoryMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (key: string): Promise<VaultAuctionBatchHistory | undefined> {
    const latest = await this.database.query(VaultAuctionHistoryMapping.index.vault_auction_history_key_sort, {
      partitionKey: key,
      order: SortOrder.DESC,
      limit: 1
    })
    return latest[0]
  }

  async query (key: string, limit: number, lt?: string, gt?: string): Promise<VaultAuctionBatchHistory[]> {
    return await this.database.query(VaultAuctionHistoryMapping.index.vault_auction_history_key_sort, {
      partitionKey: key,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt,
      gt: gt
    })
  }

  async get (id: string): Promise<VaultAuctionBatchHistory | undefined> {
    return await this.database.get(VaultAuctionHistoryMapping, id)
  }

  async put (vaultAuctionBatchHistory: VaultAuctionBatchHistory): Promise<void> {
    return await this.database.put(VaultAuctionHistoryMapping, vaultAuctionBatchHistory)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(VaultAuctionHistoryMapping, id)
  }
}

export interface VaultAuctionBatchHistory extends Model {
  id: string // -----------------------| vaultId-batchIndex-txId
  key: string // ----------------------| vaultId-batchIndex
  sort: string // ---------------------| hexEncodedHeight-txId

  vaultId: string
  index: number
  from: string
  amount: string // -------------------| stringified bignumber
  tokenId: number // ------------------| tokenId

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
