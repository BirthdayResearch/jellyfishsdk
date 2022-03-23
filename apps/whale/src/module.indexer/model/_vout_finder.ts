import { RawBlock } from '../../module.indexer/model/_abstract'
import { TransactionVout, TransactionVoutMapper } from '../../module.model/transaction.vout'
import { HexEncoder } from '../../module.model/_hex.encoder'
import { Injectable } from '@nestjs/common'

@Injectable()
export class VoutFinder {
  constructor (private readonly voutMapper: TransactionVoutMapper) {
  }

  async findVout (block: RawBlock, txid: string, n: number): Promise<TransactionVout | undefined> {
    const txn = block.tx.find(tx => tx.txid === txid)
    const vout = txn?.vout.find(vout => vout.n === n)
    if (txn !== undefined && vout !== undefined) {
      return {
        id: txn.txid + HexEncoder.encodeVoutIndex(n),
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
    return await this.voutMapper.get(txid, n)
  }
}
