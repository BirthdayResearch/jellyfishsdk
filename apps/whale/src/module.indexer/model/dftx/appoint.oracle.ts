import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { AppointOracle, CAppointOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { OracleMapper } from '@src/module.model/oracle'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { OracleHistoryMapper } from '@src/module.model/oracle.history'
import { HexEncoder } from '@src/module.model/_hex.encoder'

@Injectable()
export class AppointOracleIndexer extends DfTxIndexer<AppointOracle> {
  OP_CODE: number = CAppointOracle.OP_CODE

  constructor (
    private readonly oracleMapper: OracleMapper,
    private readonly oracleHistoryMapper: OracleHistoryMapper,
    private readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<AppointOracle>>): Promise<void> {
    for (const { txn, dftx: { data } } of txns) {
      const oracleId = txn.txid

      await this.oracleMapper.put({
        id: oracleId,
        weightage: data.weightage,
        priceFeeds: data.priceFeeds,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })

      await this.oracleHistoryMapper.put({
        id: `${oracleId}-${block.height}-${txn.txid}`,
        sort: HexEncoder.encodeHeight(block.height) + txn.txid,
        oracleId: oracleId,
        weightage: data.weightage,
        priceFeeds: data.priceFeeds,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })

      for (const { token, currency } of data.priceFeeds) {
        await this.oracleTokenCurrencyMapper.put({
          id: `${token}-${currency}-${oracleId}`,
          key: `${token}-${currency}`,
          oracleId: oracleId,
          token: token,
          currency: currency,
          weightage: data.weightage,
          block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
        })
      }
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<AppointOracle>>): Promise<void> {
    for (const { txn, dftx: { data } } of txns) {
      const oracleId = txn.txid

      await this.oracleMapper.delete(oracleId)
      await this.oracleHistoryMapper.delete(`${oracleId}-${block.height}-${txn.txid}`)
      for (const { token, currency } of data.priceFeeds) {
        await this.oracleTokenCurrencyMapper.delete(`${token}-${currency}-${oracleId}`)
      }
    }
  }
}
