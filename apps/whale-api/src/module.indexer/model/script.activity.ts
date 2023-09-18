import { defid, Indexer, RawBlock } from './_abstract'
import { ScriptActivity, ScriptActivityMapper } from '../../module.model/script.activity'
import { Injectable } from '@nestjs/common'
import { HexEncoder } from '../../module.model/_hex.encoder'
import { TransactionVout } from '../../module.model/transaction.vout'
import { VoutFinder } from './_vout_finder'
import { NotFoundIndexerError } from '../error'
import { checkIfEvmTx } from '../helper'

@Injectable()
export class ScriptActivityIndexer extends Indexer {
  constructor (
    private readonly mapper: ScriptActivityMapper,
    private readonly voutFinder: VoutFinder
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
        const vout = await this.voutFinder.findVout(block, vin.txid, vin.vout)
        if (vout === undefined) {
          throw new NotFoundIndexerError('index', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
        }
        await this.mapper.put(this.mapVin(block, txn, vin, vout))
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }
        await this.mapper.put(this.mapVout(block, txn, vout))
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

        await this.mapper.delete(this.mapId(block, 'vin', vin.txid, vin.vout))
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }
        await this.mapper.delete(this.mapId(block, 'vout', txn.txid, vout.n))
      }
    }
  }

  mapVin (block: RawBlock, txn: defid.Transaction, vin: defid.Vin, vout: TransactionVout): ScriptActivity {
    return {
      id: this.mapId(block, 'vin', vin.txid, vin.vout),
      hid: HexEncoder.asSHA256(vout.script.hex),
      type: 'vin',
      typeHex: ScriptActivityMapper.typeAsHex('vin'),
      txid: txn.txid,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      script: {
        type: vout.script.type,
        hex: vout.script.hex
      },
      vin: {
        txid: vin.txid,
        n: vin.vout
      },
      value: vout.value,
      tokenId: vout.tokenId
    }
  }

  mapVout (block: RawBlock, txn: defid.Transaction, vout: defid.Vout): ScriptActivity {
    return {
      id: this.mapId(block, 'vout', txn.txid, vout.n),
      hid: HexEncoder.asSHA256(vout.scriptPubKey.hex),
      type: 'vout',
      typeHex: ScriptActivityMapper.typeAsHex('vout'),
      txid: txn.txid,
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
        n: vout.n
      },
      value: vout.value.toFixed(8),
      tokenId: vout.tokenId
    }
  }

  mapId (block: RawBlock, type: 'vin' | 'vout', txid: string, n: number): string {
    const height = HexEncoder.encodeHeight(block.height)
    const typeHex = ScriptActivityMapper.typeAsHex(type)
    const index = HexEncoder.encodeVoutIndex(n)
    return `${height}${typeHex}${txid}${index}`
  }
}
