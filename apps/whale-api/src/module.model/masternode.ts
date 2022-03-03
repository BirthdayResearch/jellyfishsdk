import { Model, ModelMapping } from '../module.database/model'
import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'

const MasternodeMapping: ModelMapping<Masternode> = {
  type: 'masternode',
  index: {
    sort: {
      name: 'masternode_key_sort',
      partition: {
        type: 'string',
        key: (b: Masternode) => b.sort
      }
    }
  }
}

@Injectable()
export class MasternodeMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (limit: number, lt?: string): Promise<Masternode[]> {
    return await this.database.query(MasternodeMapping.index.sort, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (id: string): Promise<Masternode | undefined> {
    return await this.database.get(MasternodeMapping, id)
  }

  async put (masternode: Masternode): Promise<void> {
    return await this.database.put(MasternodeMapping, masternode)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(MasternodeMapping, id)
  }
}

export interface Masternode extends Model {
  id: string // ---------| masternodeId (txid)
  sort: string // -------| height-masternodeId

  ownerAddress: string
  operatorAddress: string
  creationHeight: number
  resignHeight: number
  resignTx?: string
  mintedBlocks: number
  timelock: number // number of weeks locked up
  collateral: string // string as decimal: 0.0000

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }
}
