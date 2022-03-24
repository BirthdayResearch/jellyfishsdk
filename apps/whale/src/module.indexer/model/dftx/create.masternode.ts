import { DfTxIndexer, DfTxTransaction } from '../../../module.indexer/model/dftx/_abstract'
import { CCreateMasternode, CreateMasternode } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../../../module.indexer/model/_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { MasternodeMapper } from '../../../module.model/masternode'
import { NetworkName } from '@defichain/jellyfish-network'
import { P2PKH, P2WPKH } from '@defichain/jellyfish-address'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { MasternodeStatsMapper, TimelockStats } from '../../../module.model/masternode.stats'
import BigNumber from 'bignumber.js'

@Injectable()
export class CreateMasternodeIndexer extends DfTxIndexer<CreateMasternode> {
  OP_CODE: number = CCreateMasternode.OP_CODE
  private readonly logger = new Logger(CreateMasternodeIndexer.name)

  constructor (
    private readonly masternodeMapper: MasternodeMapper,
    private readonly masternodeStatsMapper: MasternodeStatsMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<CreateMasternode>): Promise<void> {
    const txn = transaction.txn
    const data = transaction.dftx.data
    const ownerAddress = txn.vout[1].scriptPubKey.addresses[0]
    let operatorAddress = ownerAddress

    // This is actually the operatorPubKeyHash but jellyfish deserializes like so
    if (data.operatorPubKeyHash !== undefined) {
      if (data.operatorType === MasternodeKeyType.PKHashType) {
        operatorAddress = P2PKH.to(this.network, data.operatorPubKeyHash).utf8String
      } else { // WitV0KeyHashType
        operatorAddress = P2WPKH.to(this.network, data.operatorPubKeyHash).utf8String
      }
    }

    await this.masternodeMapper.put({
      id: txn.txid,
      sort: HexEncoder.encodeHeight(block.height) + txn.txid,
      ownerAddress,
      operatorAddress,
      creationHeight: block.height,
      resignHeight: -1,
      mintedBlocks: 0,
      timelock: data.timelock ?? 0,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
      collateral: txn.vout[1].value.toFixed(8)
    })

    await this.indexStats(block, data, txn.vout[1].value)
  }

  async indexStats (block: RawBlock, data: CreateMasternode, collateral: BigNumber): Promise<void> {
    const latest = await this.masternodeStatsMapper.getLatest()

    await this.masternodeStatsMapper.put({
      id: HexEncoder.encodeHeight(block.height),
      stats: {
        count: (latest?.stats?.count ?? 0) + 1,
        tvl: new BigNumber(latest?.stats?.tvl ?? 0).plus(collateral).toFixed(8),
        locked: this.mapTimelockStats(latest?.stats?.locked ?? [], {
          weeks: data.timelock ?? 0,
          count: 1,
          tvl: collateral.toFixed(8)
        })
      },
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  mapTimelockStats (latest: TimelockStats[], lockStats: TimelockStats): TimelockStats[] {
    const existing = latest.find(x => x.weeks === lockStats.weeks)
    if (existing === undefined) {
      return [...latest, lockStats]
    }
    return latest.map(x => ({
      ...x,
      count: x.weeks === lockStats.weeks ? (x.count + lockStats.count) : x.count,
      tvl: x.weeks === lockStats.weeks ? new BigNumber(x.tvl).plus(lockStats.tvl).toFixed(8) : x.tvl
    }))
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<CreateMasternode>): Promise<void> {
    const txn = transaction.txn
    const masternodeId = txn.txid
    await this.masternodeMapper.delete(masternodeId)
  }

  async invalidateBlockStart (block: RawBlock): Promise<void> {
    await this.masternodeStatsMapper.delete(block.height)
  }
}

enum MasternodeKeyType {
  PKHashType = 1,
  WitV0KeyHashType = 4
}
