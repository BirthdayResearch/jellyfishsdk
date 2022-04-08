import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '../module.database/model'
import { Database, SortOrder } from '../module.database/database'

const ScriptActivityMapping: ModelMapping<ScriptActivity> = {
  type: 'script_activity',
  index: {
    hid_id: {
      name: 'script_activity_hid_id',
      partition: {
        type: 'string',
        key: (d: ScriptActivity) => d.hid
      },
      sort: {
        type: 'string',
        key: (d: ScriptActivity) => d.id
      }
    }
  }
}

@Injectable()
export class ScriptActivityMapper {
  public constructor (protected readonly database: Database) {
  }

  async query (hid: string, limit: number, lt?: string): Promise<ScriptActivity[]> {
    return await this.database.query(ScriptActivityMapping.index.hid_id, {
      partitionKey: hid,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async put (activity: ScriptActivity): Promise<void> {
    return await this.database.put(ScriptActivityMapping, activity)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(ScriptActivityMapping, id)
  }

  static typeAsHex (type: ScriptActivityType): ScriptActivityTypeHex {
    // TODO(fuxingloh): not a good design, need to deprecate this
    switch (type) {
      case 'vin':
        return ScriptActivityTypeHex.VIN
      case 'vout':
        return ScriptActivityTypeHex.VOUT
    }
  }
}

export type ScriptActivityType = 'vin' | 'vout'

export enum ScriptActivityTypeHex {
  VIN = '00',
  VOUT = '01',
}

/**
 * Script moving activity
 */
export interface ScriptActivity extends Model {
  id: string // ----------------| unique id of this output: block height, type, txid(vin/vout), n(vin/vout)
  hid: string // ---------------| hashed id, for length compatibility reasons this is the hashed id of script

  type: ScriptActivityType
  typeHex: ScriptActivityTypeHex
  txid: string // --------------| txn that created the script activity

  block: {
    hash: string
    height: number
    time: number
    medianTime: number
  }

  script: {
    type: string
    hex: string
  }

  vin?: {
    txid: string
    n: number
  }

  vout?: {
    txid: string
    n: number
  }

  value: string // -------------| output value stored as string, string as decimal: 0.0000
  tokenId?: number // ----------| token id, unused currently, optional before txn v4
}
