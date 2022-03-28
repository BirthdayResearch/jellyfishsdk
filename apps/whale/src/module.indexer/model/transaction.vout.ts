import { Injectable } from '@nestjs/common'
import { Indexer, defid, RawBlock } from '../../module.indexer/model/_abstract'
import { TransactionVout, TransactionVoutMapper } from '../../module.model/transaction.vout'
import { HexEncoder } from '../../module.model/_hex.encoder'

@Injectable()
export class TransactionVoutIndexer extends Indexer {
  constructor (private readonly mapper: TransactionVoutMapper) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        await this.mapper.put(this.map(txn, vout))
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vout of txn.vout) {
        await this.mapper.delete(this.mapId(txn, vout))
      }
    }
  }

  map (txn: defid.Transaction, vout: defid.Vout): TransactionVout {
    return {
      id: this.mapId(txn, vout),
      txid: txn.txid,
      n: vout.n,
      value: vout.value.toFixed(8),
      tokenId: vout.tokenId,
      script: {
        type: vout.scriptPubKey.type,
        hex: vout.scriptPubKey.hex
      }
    }
  }

  mapId (txn: defid.Transaction, vout: defid.Vout): string {
    return txn.txid + HexEncoder.encodeVoutIndex(vout.n)
  }
}
