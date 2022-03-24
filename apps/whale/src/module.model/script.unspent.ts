import { Injectable } from '@nestjs/common'
import { Database, SortOrder } from '../module.database/database'
import { Model, ModelMapping } from '../module.database/model'

const ScriptUnspentMapping: ModelMapping<ScriptUnspent> = {
  type: 'script_unspent',
  index: {
    hid_sort: {
      name: 'script_unspent_hid_sort',
      partition: {
        type: 'string',
        key: (d: ScriptUnspent) => d.hid
      },
      sort: {
        type: 'string',
        key: (d: ScriptUnspent) => d.sort
      }
    }
  }
}

@Injectable()
export class ScriptUnspentMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (hid: string, limit: number, gt?: string): Promise<ScriptUnspent[]> {
    return await this.database.query(ScriptUnspentMapping.index.hid_sort, {
      partitionKey: hid,
      limit: limit,
      order: SortOrder.ASC,
      gt: gt
    })
  }

  async put (aggregation: ScriptUnspent): Promise<void> {
    return await this.database.put(ScriptUnspentMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(ScriptUnspentMapping, id)
  }
}

export interface ScriptUnspent extends Model {
  id: string // ----------------| unique id of this output: vout.txid and vout.n
  hid: string // ---------------| hashed id, for length compatibility reasons this is the hashed id of script
  sort: string // --------------| sort key: block height, vout.txid and vout.n

  block: {
    hash: string // ------------| block hash of this script unspent
    height: number // ----------| block height of this script unspent
    time: number
    medianTime: number
  }

  script: {
    type: string // ------------| known type of the script
    hex: string // -------------| script in encoded in hex
  }

  vout: {
    txid: string // ------------| txn that created this unspent
    n: number // ---------------| index number of this output within the transaction, if coinbase it will be 0
    value: string // -----------| output value stored as string, string as decimal: 0.0000
    tokenId?: number // --------| dct id, unused currently, optional before txn v4
  }
}
