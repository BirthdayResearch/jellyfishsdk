import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '../module.database/model'
import { Database, SortOrder } from '../module.database/database'
import { HexEncoder } from '../module.model/_hex.encoder'

const ScriptAggregationMapping: ModelMapping<ScriptAggregation> = {
  type: 'script_aggregation',
  index: {
    hid_height: {
      name: 'script_aggregation_hid_height',
      partition: {
        type: 'string',
        key: (d: ScriptAggregation) => d.hid
      },
      sort: {
        type: 'number',
        key: (d: ScriptAggregation) => d.block.height
      }
    }
  }
}

@Injectable()
export class ScriptAggregationMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (hid: string): Promise<ScriptAggregation | undefined> {
    const aggregations = await this.database.query(ScriptAggregationMapping.index.hid_height, {
      partitionKey: hid,
      order: SortOrder.DESC,
      limit: 1
    })
    return aggregations.length === 0 ? undefined : aggregations[0]
  }

  async query (hid: string, limit: number, lt?: number): Promise<ScriptAggregation[]> {
    return await this.database.query(ScriptAggregationMapping.index.hid_height, {
      partitionKey: hid,
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (hid: string, height: number): Promise<ScriptAggregation | undefined> {
    return await this.database.get(ScriptAggregationMapping, HexEncoder.encodeHeight(height) + hid)
  }

  async put (aggregation: ScriptAggregation): Promise<void> {
    return await this.database.put(ScriptAggregationMapping, aggregation)
  }

  async delete (id: string): Promise<void> {
    return await this.database.delete(ScriptAggregationMapping, id)
  }
}

/**
 * ScriptAggregation represent a directed acyclic graph node of script activity in the blockchain.
 * ScriptAggregation is a vertex that forms a linear forward moving aggregation of script activity.
 *
 * ScriptAggregation uses a composite key, the partition key is the script hex that is hashed
 * for length compatibility reasons as the max of 10kb is too large for many database provider.
 * The sort key is the height of the block that generated this aggregation. If there is no script
 * activity at a particular block height, ScriptAggregation will not be created at that block height.
 *
 * To query the latest script activity aggregation in the blockchain, you can query hex_height
 * index with (sort by desc and limit 1). That will always return the latest script activity in
 * the chain in the database.
 *
 * Blocks  | Block 1 | Block 2 | Block 3 | Block 4 | Block 5 | Block 6 |
 * --------|---------|---------|---------|---------|---------|---------|
 * Txn     |   out   |   in    |         |         |         |         |
 * Inputs  |         |   out   |         |         |   in    |         |
 * &       |         |         |   out   |         |   in    |         |
 * Outputs |         |         |         |         |   out   |   in    |
 * --------|---------|---------|---------|---------|---------|---------|
 * Hash    | 0       | prev    | prev    |         | prev    | prev    |
 *         | + out   | + in    | + out   |         | + in    | + in    |
 *         |         | + out   |         |         | + in    |         |
 *         |         |         |         |         | + out   |         |
 * --------|---------|---------|---------|---------|---------|---------|
 * Agg     | + $     | - $     | + $     |         | - $     | - $     |
 * Amount  |         | + $     |         |         | - $     |         |
 *         |         |         |         |         | + $     |         |
 * --------|---------|---------|---------|---------|---------|---------|
 * Agg     | out +=1 | out +=1 | out +=1 |         | out +=1 |         | = 4
 * Count   |         | in  +=1 |         |         | in  +=2 | in  +=1 | = 4
 *         | sum +=1 | sum +=2 | sum +=1 |         | sum +=3 | sum +=1 | = 8
 * --------|---------|---------|---------|---------|---------|---------|
 */
export interface ScriptAggregation extends Model {
  id: string // ------------------| unique id of this output: block height + hid
  hid: string // -----------------| hashed id, for length compatibility reasons this is the hashed id of script

  block: {
    hash: string // --------------| block hash of this script aggregation
    height: number // ------------| block height of this script aggregation
    time: number
    medianTime: number
  }

  script: {
    type: string // --------------| known type of the script
    hex: string // ---------------| script in encoded in hex
  }

  statistic: {
    txCount: number // -----------| total num of in & out transaction up to block height, see above
    txInCount: number // ---------| total num of transaction going in up to block height, see above
    txOutCount: number // --------| total num of transaction going out up to block height, see above
  }

  amount: { // -------------------| stored as string, string as decimal: 0.0000
    txIn: string // --------------| sum of all value going in up to block height
    txOut: string // -------------| sum of all value going out up to block height
    unspent: string // -----------| sum of all unspent value up to block height
  }
}
