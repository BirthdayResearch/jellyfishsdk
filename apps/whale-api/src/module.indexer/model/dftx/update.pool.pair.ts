import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CPoolUpdatePair, PoolUpdatePair } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable, Logger } from '@nestjs/common'
import { PoolPairHistoryMapper } from '@src/module.model/pool.pair.history'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class UpdatePoolPairIndexer extends DfTxIndexer<PoolUpdatePair> {
  OP_CODE: number = CPoolUpdatePair.OP_CODE
  private readonly logger = new Logger(UpdatePoolPairIndexer.name)

  constructor (
    private readonly poolPairHistoryMapper: PoolPairHistoryMapper
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<PoolUpdatePair>): Promise<void> {
    const txid = transaction.txn.txid
    const data = transaction.dftx.data

    const poolPair = await this.poolPairHistoryMapper.getLatest(`${data.poolId}`)
    if (poolPair !== undefined) {
      await this.poolPairHistoryMapper.put({
        ...poolPair,
        id: txid,
        sort: HexEncoder.encodeHeight(block.height) + HexEncoder.encodeHeight(transaction.txnNo),
        block: {
          hash: block.hash,
          height: block.height,
          medianTime: block.mediantime,
          time: block.time
        },
        status: data.status, // Always override status
        commission: data.commission.gte(0) ? data.commission.toFixed(8) : poolPair.commission
      })
    }
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<PoolUpdatePair>): Promise<void> {
    const txid = transaction.txn.txid
    await this.poolPairHistoryMapper.delete(txid)
  }
}
