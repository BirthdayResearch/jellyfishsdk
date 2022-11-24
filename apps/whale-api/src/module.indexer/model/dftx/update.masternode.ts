import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CUpdateMasternode, UpdateMasternode, UpdateMasternodeAddress } from '@defichain/jellyfish-transaction'
import { P2PKH, P2WPKH } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { RawBlock } from '../_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { Masternode, MasternodeMapper } from '../../../module.model/masternode'
import { MasternodeStatsMapper, TimelockStats } from '../../../module.model/masternode.stats'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import BigNumber from 'bignumber.js'

@Injectable()
export class UpdateMasternodeIndexer extends DfTxIndexer<UpdateMasternode> {
  OP_CODE: number = CUpdateMasternode.OP_CODE

  constructor (
    private readonly masternodeMapper: MasternodeMapper,
    private readonly masternodeStatsMapper: MasternodeStatsMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  convertAddress (address: UpdateMasternodeAddress): string | null {
    if (address.addressPubKeyHash !== undefined) {
      if (address.addressType === MasternodeKeyType.PKHashType) {
        return P2PKH.to(this.network, address.addressPubKeyHash).utf8String
      }
      return P2WPKH.to(this.network, address.addressPubKeyHash).utf8String
    }
    return null
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateMasternode>): Promise<void> {
    const txn = transaction.txn
    const data = transaction.dftx.data

    let ownerAddress = null
    let operatorAddress = null
    for (const update of data.updates) {
      /**
       * // No need to handle reward address
       * // because no rewardAddress in index
       * 0x01 = OwnerAddress
       * 0x02 = OperatorAddress
       * 0x03 = SetRewardAddress
       * 0x04 = RemRewardAddress
       */
      if (update.address !== undefined && update.updateType === 1) {
        ownerAddress = txn.vout[1].scriptPubKey.addresses[0]
      }
      if (update.address !== undefined && update.updateType === 2) {
        operatorAddress = this.convertAddress(update.address)
      }
    }

    const mn = await this.masternodeMapper.get(data.nodeId)
    if (mn !== undefined) {
      let updateRecords: Array<{
        height: number
        ownerAddress: string
        operatorAddress: string
      }> = []

      if (mn.updateRecords !== undefined) {
        updateRecords = [...mn.updateRecords]
      }

      updateRecords = [
        {
          height: block.height,
          ownerAddress: (ownerAddress !== null) ? ownerAddress : mn.ownerAddress,
          operatorAddress: (operatorAddress !== null) ? operatorAddress : mn.operatorAddress
        },
        ...updateRecords
      ]

      await this.masternodeMapper.put({
        id: data.nodeId,
        sort: `${HexEncoder.encodeHeight(block.height)}${txn.txid}`,
        ownerAddress: (ownerAddress !== null) ? ownerAddress : mn.ownerAddress,
        operatorAddress: (operatorAddress !== null) ? operatorAddress : mn.operatorAddress,
        creationHeight: block.height,
        resignHeight: -1,
        mintedBlocks: 0,
        timelock: 0,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
        collateral: txn.vout[1].value.toFixed(8),
        updateRecords
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

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateMasternode>): Promise<void> {
    const txn = transaction.txn
    const data = transaction.dftx.data

    const mn = await this.masternodeMapper.get(data.nodeId)
    if (mn !== undefined) {
      let updateRecords = mn.updateRecords ?? []
      updateRecords = updateRecords.filter(record => record.height !== block.height)

      await this.masternodeMapper.put({
        id: data.nodeId,
        sort: `${HexEncoder.encodeHeight(block.height)}${txn.txid}`,
        ownerAddress: updateRecords[0].ownerAddress,
        operatorAddress: updateRecords[0].operatorAddress,
        creationHeight: block.height,
        resignHeight: -1,
        mintedBlocks: 0,
        timelock: 0,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
        collateral: txn.vout[1].value.toFixed(8),
        updateRecords
      })

      await this.indexStats(block, mn)
    }
  }

  async invalidateBlockStart (block: RawBlock): Promise<void> {
    await this.masternodeStatsMapper.delete(block.height)
  }
}

enum MasternodeKeyType {
  PKHashType = 1,
  WitV0KeyHashType = 4
}
