import { Injectable } from '@nestjs/common'
import { Indexer, defid, RawBlock } from '@src/module.indexer/model/_abstract'
import { Transaction, TransactionMapper } from '@src/module.model/transaction'

@Injectable()
export class TransactionIndexer extends Indexer {
  constructor (private readonly mapper: TransactionMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      await this.mapper.put(this.map(block, txn))
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      await this.mapper.delete(txn.txid)
    }
  }

  map (block: RawBlock, txn: defid.Transaction): Transaction {
    return {
      id: txn.txid,
      block: {
        hash: block.hash,
        height: block.height
      },
      txid: txn.txid,
      hash: txn.hash,
      version: txn.version,
      size: txn.size,
      vSize: txn.vsize,
      weight: txn.weight,
      lockTime: txn.locktime,
      vinCount: txn.vin.length,
      voutCount: txn.vout.length
    }
  }
}
