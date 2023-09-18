import { ScriptUnspent, ScriptUnspentMapper } from '../../module.model/script.unspent'
import { defid, Indexer, RawBlock } from './_abstract'
import { Injectable } from '@nestjs/common'
import { HexEncoder } from '../../module.model/_hex.encoder'
import { TransactionVout, TransactionVoutMapper } from '../../module.model/transaction.vout'
import { Transaction, TransactionMapper } from '../../module.model/transaction'
import { NotFoundIndexerError } from '../error'
import { checkIfEvmTx } from '../helper'

@Injectable()
export class ScriptUnspentIndexer extends Indexer {
  constructor (
    private readonly unspentMapper: ScriptUnspentMapper,
    private readonly transactionMapper: TransactionMapper,
    private readonly voutMapper: TransactionVoutMapper
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      const isEvmTx = checkIfEvmTx(txn)

      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined || isEvmTx) {
          continue
        }
        await this.unspentMapper.delete(vin.txid + HexEncoder.encodeVoutIndex(vin.vout))
      }

      for (const vout of txn.vout) {
        await this.unspentMapper.put(this.mapIndexed(block, txn, vout))
      }
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    for (const txn of block.tx) {
      const isEvmTx = checkIfEvmTx(txn)

      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined || isEvmTx) {
          continue
        }

        const txn = await this.transactionMapper.get(vin.txid)
        const vout = await this.voutMapper.get(vin.txid, vin.vout)
        if (txn === undefined) {
          throw new NotFoundIndexerError('invalidate', 'Transaction', vin.txid)
        }
        if (vout === undefined) {
          throw new NotFoundIndexerError('invalidate', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
        }
        await this.unspentMapper.put(this.mapInvalidated(txn, vout))
      }

      for (const vout of txn.vout) {
        await this.unspentMapper.delete(txn.txid + HexEncoder.encodeVoutIndex(vout.n))
      }
    }
  }

  mapIndexed (block: RawBlock, txn: defid.Transaction, vout: defid.Vout): ScriptUnspent {
    return {
      id: txn.txid + HexEncoder.encodeVoutIndex(vout.n),
      hid: HexEncoder.asSHA256(vout.scriptPubKey.hex),
      sort: HexEncoder.encodeHeight(block.height) + txn.txid + HexEncoder.encodeVoutIndex(vout.n),
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      script: {
        type: vout.scriptPubKey.type,
        hex: vout.scriptPubKey.hex
      },
      vout: {
        txid: txn.txid,
        n: vout.n,
        value: vout.value.toFixed(8),
        tokenId: vout.tokenId
      }
    }
  }

  mapInvalidated (txn: Transaction, vout: TransactionVout): ScriptUnspent {
    return {
      id: vout.txid + HexEncoder.encodeVoutIndex(vout.n),
      hid: HexEncoder.asSHA256(vout.script.hex),
      sort: HexEncoder.encodeHeight(txn.block.height) + txn.txid + HexEncoder.encodeVoutIndex(vout.n),
      block: {
        hash: txn.block.hash,
        height: txn.block.height,
        time: txn.block.time,
        medianTime: txn.block.medianTime
      },
      script: {
        type: vout.script.type,
        hex: vout.script.hex
      },
      vout: {
        txid: vout.txid,
        n: vout.n,
        value: vout.value,
        tokenId: vout.tokenId
      }
    }
  }
}
