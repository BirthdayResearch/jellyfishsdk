import { DfTxIndexer, DfTxTransaction } from '../../../module.indexer/model/dftx/_abstract'
import { AppointOracle, CAppointOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../../../module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { OracleMapper } from '../../../module.model/oracle'
import { OracleTokenCurrencyMapper } from '../../../module.model/oracle.token.currency'
import { OracleHistoryMapper } from '../../../module.model/oracle.history'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScript } from '@defichain/jellyfish-address'

@Injectable()
export class AppointOracleIndexer extends DfTxIndexer<AppointOracle> {
  OP_CODE: number = CAppointOracle.OP_CODE

  constructor (
    private readonly oracleMapper: OracleMapper,
    private readonly oracleHistoryMapper: OracleHistoryMapper,
    private readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<AppointOracle>): Promise<void> {
    const data = transaction.dftx.data
    const txn = transaction.txn
    const oracleId = txn.txid

    await this.oracleMapper.put({
      id: oracleId,
      ownerAddress: fromScript(data.script, this.network)?.address ?? '',
      weightage: data.weightage,
      priceFeeds: data.priceFeeds,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })

    await this.oracleHistoryMapper.put({
      id: `${oracleId}-${block.height}-${txn.txid}`,
      sort: HexEncoder.encodeHeight(block.height) + txn.txid,
      ownerAddress: fromScript(data.script, this.network)?.address ?? '',
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

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<AppointOracle>): Promise<void> {
    const data = transaction.dftx.data
    const txn = transaction.txn
    const oracleId = txn.txid

    await this.oracleMapper.delete(oracleId)
    await this.oracleHistoryMapper.delete(`${oracleId}-${block.height}-${txn.txid}`)
    for (const { token, currency } of data.priceFeeds) {
      await this.oracleTokenCurrencyMapper.delete(`${token}-${currency}-${oracleId}`)
    }
  }
}
