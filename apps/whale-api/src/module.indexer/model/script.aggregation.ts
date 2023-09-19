import { Injectable } from '@nestjs/common'
import { Indexer, RawBlock } from './_abstract'
import { ScriptAggregation, ScriptAggregationMapper } from '../../module.model/script.aggregation'
import { VoutFinder } from './_vout_finder'
import { HexEncoder } from '../../module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { NotFoundIndexerError } from '../error'
import { checkIfEvmTx } from '../helper'

@Injectable()
export class ScriptAggregationIndexer extends Indexer {
  constructor (
    private readonly mapper: ScriptAggregationMapper,
    private readonly voutFinder: VoutFinder
  ) {
    super()
  }

  async index (block: RawBlock): Promise<void> {
    const records: Record<string, ScriptAggregation> = {}

    function findScriptAggregation (hex: string, type: string): ScriptAggregation {
      const hid = HexEncoder.asSHA256(hex)
      if (records[hid] === undefined) {
        records[hid] = ScriptAggregationIndexer.newScriptAggregation(block, hex, type)
      }
      return records[hid]
    }

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

        // Spent (REMOVE)
        const aggregation = findScriptAggregation(vout.script.hex, vout.script.type)
        aggregation.statistic.txOutCount += 1
        aggregation.amount.txOut = new BigNumber(aggregation.amount.txOut).plus(vout.value).toFixed(8)
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        // Unspent (ADD)
        const aggregation = findScriptAggregation(vout.scriptPubKey.hex, vout.scriptPubKey.type)
        aggregation.statistic.txInCount += 1
        aggregation.amount.txIn = new BigNumber(aggregation.amount.txIn).plus(vout.value).toFixed(8)
      }
    }

    for (const aggregation of Object.values(records)) {
      const latest = await this.mapper.getLatest(aggregation.hid)
      if (latest !== undefined) {
        aggregation.statistic.txInCount += latest.statistic.txInCount
        aggregation.statistic.txOutCount += latest.statistic.txOutCount

        aggregation.amount.txIn = new BigNumber(aggregation.amount.txIn).plus(latest.amount.txIn).toFixed(8)
        aggregation.amount.txOut = new BigNumber(aggregation.amount.txOut).plus(latest.amount.txOut).toFixed(8)
      }

      aggregation.statistic.txCount = aggregation.statistic.txInCount + aggregation.statistic.txOutCount
      aggregation.amount.unspent = new BigNumber(aggregation.amount.txIn).minus(aggregation.amount.txOut).toFixed(8)

      await this.mapper.put(aggregation)
    }
  }

  async invalidate (block: RawBlock): Promise<void> {
    const hidList = new Set<string>()

    for (const txn of block.tx) {
      const isEvmTx = checkIfEvmTx(txn)

      for (const vin of txn.vin) {
        if (vin.coinbase !== undefined || isEvmTx) {
          continue
        }

        const vout = await this.voutFinder.findVout(block, vin.txid, vin.vout)
        if (vout === undefined) {
          throw new NotFoundIndexerError('invalidate', 'TransactionVout', `${vin.txid} - ${vin.vout}`)
        }
        hidList.add(HexEncoder.asSHA256(vout.script.hex))
      }

      for (const vout of txn.vout) {
        if (vout.scriptPubKey.hex.startsWith('6a')) {
          continue
        }

        hidList.add(HexEncoder.asSHA256(vout.scriptPubKey.hex))
      }
    }

    for (const hid of hidList) {
      await this.mapper.delete(HexEncoder.encodeHeight(block.height) + hid)
    }
  }

  static newScriptAggregation (block: RawBlock, hex: string, type: string): ScriptAggregation {
    const hid = HexEncoder.asSHA256(hex)

    return {
      id: HexEncoder.encodeHeight(block.height) + hid,
      hid: hid,
      block: {
        hash: block.hash,
        height: block.height,
        time: block.time,
        medianTime: block.mediantime
      },
      script: {
        type: type,
        hex: hex
      },
      statistic: {
        txCount: 0,
        txInCount: 0,
        txOutCount: 0
      },
      amount: {
        txIn: '0.00000000',
        txOut: '0.00000000',
        unspent: '0.00000000'
      }
    }
  }
}
