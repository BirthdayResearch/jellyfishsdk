import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CSetFutureSwap, SetFutureSwap } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { FutureSwapMapper } from '@src/module.model/future.swap'
import { NetworkName } from '@defichain/jellyfish-network'
import { toBuffer } from '@defichain/jellyfish-transaction/dist/script/_buffer'

/* eslint-disable @typescript-eslint/no-non-null-assertion */

@Injectable()
export class SetFutureSwapIndexer extends DfTxIndexer<SetFutureSwap> {
  OP_CODE: number = CSetFutureSwap.OP_CODE
  private readonly logger = new Logger(SetFutureSwapIndexer.name)

  constructor (
    private readonly futureSwapMapper: FutureSwapMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetFutureSwap>): Promise<void> {
    const txid = transaction.txn.txid
    const data = transaction.dftx.data

    await this.futureSwapMapper.put({
      id: txid,
      key: toBuffer(data.owner.stack).toString('hex'),
      sort: `${HexEncoder.encodeHeight(block.height)}-${txid}`,
      source: {
        token: data.source.token,
        amount: data.source.amount.toString()
      },
      destination: data.destination,
      withdraw: data.withdraw,
      block: {
        hash: block.hash,
        height: block.height,
        medianTime: block.mediantime,
        time: block.time
      }
    })
  }

  async invalidateTransaction (_: RawBlock, transaction: DfTxTransaction<SetFutureSwap>): Promise<void> {
    const txid = transaction.txn.txid
    await this.futureSwapMapper.delete(txid)
  }
}
