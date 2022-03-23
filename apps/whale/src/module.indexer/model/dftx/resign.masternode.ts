import { DfTxIndexer, DfTxTransaction } from '../../../module.indexer/model/dftx/_abstract'
import { CResignMasternode, ResignMasternode } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../../../module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { Masternode, MasternodeMapper } from '../../../module.model/masternode'
import { MasternodeStatsMapper, TimelockStats } from '../../../module.model/masternode.stats'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import BigNumber from 'bignumber.js'

@Injectable()
export class ResignMasternodeIndexer extends DfTxIndexer<ResignMasternode> {
  OP_CODE: number = CResignMasternode.OP_CODE

  constructor (
    private readonly masternodeMapper: MasternodeMapper,
    private readonly masternodeStatsMapper: MasternodeStatsMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<ResignMasternode>): Promise<void> {
    const txn = transaction.txn
    const data = transaction.dftx.data
    const mn = await this.masternodeMapper.get(data.nodeId)
    if (mn !== undefined) {
      await this.masternodeMapper.put({
        ...mn,
        resignHeight: block.height,
        resignTx: txn.txid
      })

      await this.indexStats(block, mn)
    }
  }

  async indexStats (block: RawBlock, data: Masternode): Promise<void> {
    const latest = await this.masternodeStatsMapper.getLatest()

    await this.masternodeStatsMapper.put({
      id: HexEncoder.encodeHeight(block.height),
      stats: {
        count: (latest?.stats?.count ?? 0) - 1,
        tvl: new BigNumber(latest?.stats?.tvl ?? 0).minus(data.collateral).toFixed(8),
        locked: this.mapTimelockStats(latest?.stats?.locked ?? [], {
          weeks: data.timelock ?? 0,
          count: 1,
          tvl: data.collateral
        })
      },
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  mapTimelockStats (latest: TimelockStats[], lockStats: TimelockStats): TimelockStats[] {
    return latest.map(x => ({
      ...x,
      count: x.weeks === lockStats.weeks ? (x.count - lockStats.count) : x.count,
      tvl: x.weeks === lockStats.weeks ? new BigNumber(x.tvl).minus(lockStats.tvl).toFixed(8) : x.tvl
    }))
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<ResignMasternode>): Promise<void> {
    const data = transaction.dftx.data
    const mn = await this.masternodeMapper.get(data.nodeId)
    if (mn !== undefined) {
      delete mn.resignTx
      await this.masternodeMapper.put({ ...mn, resignHeight: -1 })
    }
  }

  async invalidateBlockStart (block: RawBlock): Promise<void> {
    await this.masternodeStatsMapper.delete(block.height)
  }
}
