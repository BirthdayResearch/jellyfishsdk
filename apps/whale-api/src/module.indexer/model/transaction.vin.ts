import { Injectable } from '@nestjs/common'
import { Indexer, defid, RawBlock } from '@src/module.indexer/model/_abstract'
import { TransactionVin, TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVout } from '@src/module.model/transaction.vout'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { VoutFinder } from '@src/module.indexer/model/_vout_finder'
import { NotFoundIndexerError } from '@src/module.indexer/error'

@Injectable()
export class TransactionVinIndexer extends Indexer {
  constructor (
    private readonly vinMapper: TransactionVinMapper,
    private readonly voutFinder: VoutFinder
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined) {
          await this.vinMapper.put(this.map(txn, vin, undefined))
        } else {
          const vout = await this.voutFinder.findVout(block, vin.txid, vin.vout)
          if (vout === undefined) {
            throw new NotFoundIndexerError('index', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
          }
          await this.vinMapper.put(this.map(txn, vin, vout))
        }
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      for (const vin of txn.vin) {
        await this.vinMapper.delete(this.mapId(txn, vin))
      }
    }
  }

  map (txn: defid.Transaction, vin: defid.Vin, vout?: TransactionVout): TransactionVin {
    return {
      id: this.mapId(txn, vin),
      txid: txn.txid,
      coinbase: vin.coinbase,
      vout: vout !== undefined ? {
        id: vout.id,
        txid: vout.txid,
        n: vout.n,
        value: vout.value,
        tokenId: vout.tokenId
      } : undefined,
      script: vin.scriptSig !== undefined ? {
        hex: vin.scriptSig.hex
      } : undefined,
      txInWitness: vin.txinwitness,
      sequence: vin.sequence
    }
  }

  /**
   * non coinbase: txn.txid + vout.txid + vout.n (4 bytes encoded hex)
   *     coinbase: txn.txid + '00'
   */
  mapId (txn: defid.Transaction, vin: defid.Vin): string {
    if (vin.coinbase !== undefined) {
      return txn.txid + '00'
    }
    return txn.txid + vin.txid + HexEncoder.encodeVoutIndex(vin.vout)
  }
}
