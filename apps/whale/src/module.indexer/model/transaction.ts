import { Injectable } from '@nestjs/common'
import { defid, Indexer, RawBlock } from '@src/module.indexer/model/_abstract'
import { Transaction, TransactionMapper } from '@src/module.model/transaction'
import BigNumber from 'bignumber.js'

@Injectable()
export class TransactionIndexer extends Indexer {
  constructor (private readonly mapper: TransactionMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const [order, txn] of block.tx.entries()) {
      const totalVOut = txn.vout.reduce<BigNumber>((prev, vout) => {
        return prev.plus(vout.value)
      }, new BigNumber(0))
      await this.mapper.put(this.map(block, txn, order, totalVOut.toFixed(8)))
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      await this.mapper.delete(txn.txid)
    }
  }

  map (block: RawBlock, txn: defid.Transaction, order: number, totalVOut: string): Transaction {
    return {
      id: txn.txid,
      order: order,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      txid: txn.txid,
      hash: txn.hash,
      version: txn.version,
      size: txn.size,
      vSize: txn.vsize,
      weight: txn.weight,
      lockTime: txn.locktime,
      vinCount: txn.vin.length,
      voutCount: txn.vout.length,
      totalVoutValue: totalVOut
    }
  }
}
