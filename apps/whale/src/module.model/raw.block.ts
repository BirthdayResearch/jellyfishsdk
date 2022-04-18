import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '../module.database/model'
import { Database } from '../module.database/database'
import { blockchain as defid } from '@defichain/jellyfish-api-core'
import { JellyfishJSON } from '@defichain/jellyfish-json'

const RawBlockMapping: ModelMapping<RawBlock> = {
  type: 'raw_block',
  index: {}
}

/**
 * RawBlock data from defid with verbose 2, Block<Transaction>
 * Data indexed in store for module.sync to reorg index in event of chain split.
 */
@Injectable()
export class RawBlockMapper {
  public constructor (protected readonly database: Database) {
  }

  async get (hash: string): Promise<defid.Block<defid.Transaction> | undefined> {
    const cached = await this.database.get(RawBlockMapping, hash)
    if (cached === undefined) {
      return undefined
    }

    return JellyfishJSON.parse(cached.json, {
      tx: {
        vout: {
          value: 'bignumber'
        }
      }
    })
  }

  async put (block: defid.Block<defid.Transaction>): Promise<void> {
    return await this.database.put(RawBlockMapping, {
      id: block.hash,
      json: JellyfishJSON.stringify(block)
    })
  }

  async delete (hash: string): Promise<void> {
    return await this.database.delete(RawBlockMapping, hash)
  }
}

export interface RawBlock extends Model {
  id: string // -----------------| hash
  json: string // ---------------| block encoded in JSON with JellyfishJSON from defid with verbose 2
}
