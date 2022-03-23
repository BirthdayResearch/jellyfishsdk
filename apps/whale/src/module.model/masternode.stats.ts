import { Injectable } from '@nestjs/common'
import { Model, ModelMapping } from '../module.database/model'
import { Database, SortOrder } from '../module.database/database'
import { HexEncoder } from '../module.model/_hex.encoder'

const MasternodeStatsMapping: ModelMapping<MasternodeStats> = {
  type: 'masternode_stats',
  index: {
    height: {
      name: 'masternode_stats_height',
      partition: {
        type: 'number',
        key: (d: MasternodeStats) => d.block.height
      }
    }
  }
}

@Injectable()
export class MasternodeStatsMapper {
  public constructor (protected readonly database: Database) {
  }

  async getLatest (): Promise<MasternodeStats | undefined> {
    const stats = await this.database.query(MasternodeStatsMapping.index.height, {
      order: SortOrder.DESC,
      limit: 1
    })
    return stats.length === 0 ? undefined : stats[0]
  }

  async query (limit: number, lt?: number): Promise<MasternodeStats[]> {
    return await this.database.query(MasternodeStatsMapping.index.height, {
      limit: limit,
      order: SortOrder.DESC,
      lt: lt
    })
  }

  async get (height: number): Promise<MasternodeStats | undefined> {
    return await this.database.get(MasternodeStatsMapping, HexEncoder.encodeHeight(height))
  }

  async put (stats: MasternodeStats): Promise<void> {
    return await this.database.put(MasternodeStatsMapping, stats)
  }

  async delete (height: number): Promise<void> {
    return await this.database.delete(MasternodeStatsMapping, HexEncoder.encodeHeight(height))
  }
}

export interface MasternodeStats extends Model {
  id: string // ------------------| block height

  block: {
    hash: string // --------------| block hash of this masternode stats
    height: number // ------------| block height of this masternode stats
    time: number
    medianTime: number
  }

  stats: {
    count: number // --------------| total count of active masternodes
    tvl: string // ----------------| string as decimal: 0.0000
    locked: TimelockStats[] // ----| TimelockStats[]
  }
}

export interface TimelockStats {
  weeks: number // ----------------| weeks this category is locked up for
  tvl: string // ------------------| string as decimal: 0.0000
  count: number // ----------------| total count of active masternodes
}
