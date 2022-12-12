import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CUpdateMasternode, UpdateMasternode, UpdateMasternodeAddress } from '@defichain/jellyfish-transaction'
import { P2PKH, P2WPKH } from '@defichain/jellyfish-address'
import { NetworkName } from '@defichain/jellyfish-network'
import { RawBlock } from '../_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { MasternodeMapper } from '../../../module.model/masternode'
import { MasternodeStatsMapper } from '../../../module.model/masternode.stats'

@Injectable()
export class UpdateMasternodeIndexer extends DfTxIndexer<UpdateMasternode> {
  OP_CODE: number = CUpdateMasternode.OP_CODE

  constructor (
    private readonly masternodeMapper: MasternodeMapper,
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
        ...mn,
        ownerAddress: (ownerAddress !== null) ? ownerAddress : mn.ownerAddress,
        operatorAddress: (operatorAddress !== null) ? operatorAddress : mn.operatorAddress,
        updateRecords
      })
    }
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateMasternode>): Promise<void> {
    const data = transaction.dftx.data

    const mn = await this.masternodeMapper.get(data.nodeId)
    if (mn !== undefined) {
      let updateRecords = mn.updateRecords ?? []
      updateRecords = updateRecords.filter(record => record.height !== block.height)

      await this.masternodeMapper.put({
        ...mn,
        creationHeight: block.height,
        ownerAddress: updateRecords[0].ownerAddress,
        operatorAddress: updateRecords[0].operatorAddress,
        updateRecords
      })
    }
  }
}

enum MasternodeKeyType {
  PKHashType = 1,
  WitV0KeyHashType = 4
}
