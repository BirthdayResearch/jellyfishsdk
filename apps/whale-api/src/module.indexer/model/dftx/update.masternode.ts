import { DfTxIndexer, DfTxTransaction } from './_abstract'
import { CUpdateMasternode, UpdateMasternode } from '@defichain/jellyfish-transaction'
import { NetworkName } from '@defichain/jellyfish-network'
import { RawBlock } from '../_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { MasternodeMapper } from '../../../module.model/masternode'
import { CreateMasternodeIndexer } from './create.masternode'

@Injectable()
export class UpdateMasternodeIndexer extends DfTxIndexer<UpdateMasternode> {
  OP_CODE: number = CUpdateMasternode.OP_CODE

  constructor (
    private readonly masternodeMapper: MasternodeMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateMasternode>): Promise<void> {
    const masternodeId = transaction.dftx.data.nodeId
    const masternode = await this.masternodeMapper.get(masternodeId)
    const updates = this.getUpdates(transaction)

    if (masternode !== undefined) {
      await this.masternodeMapper.put({
        ...masternode,
        ownerAddress: updates.owner ?? masternode.ownerAddress,
        operatorAddress: updates.operator ?? masternode.operatorAddress,
        history: [
          {
            txid: transaction.txn.txid,
            ownerAddress: updates.owner ?? masternode.ownerAddress,
            operatorAddress: updates.operator ?? masternode.operatorAddress
          },
          ...masternode.history ?? [
            {
              txid: masternode.id,
              ownerAddress: masternode.ownerAddress,
              operatorAddress: masternode.operatorAddress
            }
          ]
        ]
      })
    }
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateMasternode>): Promise<void> {
    const masternodeId = transaction.dftx.data.nodeId
    const masternode = await this.masternodeMapper.get(masternodeId)

    if (masternode !== undefined) {
      const history = masternode.history ?? []

      await this.masternodeMapper.put({
        ...masternode,
        ownerAddress: history[1].ownerAddress ?? masternode.ownerAddress,
        operatorAddress: history[1].operatorAddress ?? masternode.operatorAddress,
        history: history.slice(0, 1)
      })
    }
  }

  /**
   * 0x01 = OwnerAddress
   * 0x02 = OperatorAddress
   * 0x03 = SetRewardAddress
   * 0x04 = RemRewardAddress
   *
   * @see UpdateMasternodeData
   */
  private getUpdates (transaction: DfTxTransaction<UpdateMasternode>): { owner?: string, operator?: string } {
    const updates: { owner?: string, operator?: string } = {}

    for (const update of transaction.dftx.data.updates) {
      if (update.address !== undefined && update.updateType === 0x01) {
        updates.owner = transaction.txn.vout[1].scriptPubKey.addresses[0]
      }
      if (update.address !== undefined && update.updateType === 0x02 && update.address.addressPubKeyHash !== undefined) {
        updates.operator = CreateMasternodeIndexer.getAddress(this.network, update.address.addressType, update.address.addressPubKeyHash)
      }
    }

    return updates
  }
}
