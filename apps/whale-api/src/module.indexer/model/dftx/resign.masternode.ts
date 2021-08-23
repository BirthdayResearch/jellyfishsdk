import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CResignMasternode, ResignMasternode } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { MasternodeMapper } from '@src/module.model/masternode'

@Injectable()
export class ResignMasternodeIndexer extends DfTxIndexer<ResignMasternode> {
  OP_CODE: number = CResignMasternode.OP_CODE

  constructor (
    private readonly masternodeMapper: MasternodeMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<ResignMasternode>>): Promise<void> {
    for (const { txn, dftx: { data } } of txns) {
      const mn = await this.masternodeMapper.get(data.nodeId)
      if (mn !== undefined) {
        await this.masternodeMapper.put({
          ...mn,
          resignHeight: block.height,
          resignTx: txn.txid
        })
      }
    }
  }

  async invalidate (_: RawBlock, txns: Array<DfTxTransaction<ResignMasternode>>): Promise<void> {
    for (const { dftx: { data } } of txns) {
      const mn = await this.masternodeMapper.get(data.nodeId)
      if (mn !== undefined) {
        delete mn.resignTx
        await this.masternodeMapper.put({ ...mn, resignHeight: -1 })
      }
    }
  }
}
