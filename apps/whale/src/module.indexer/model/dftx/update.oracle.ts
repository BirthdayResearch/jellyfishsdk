import { DfTxIndexer, DfTxTransaction } from '../../../module.indexer/model/dftx/_abstract'
import { CUpdateOracle, UpdateOracle } from '@defichain/jellyfish-transaction'
import { RawBlock } from '../../../module.indexer/model/_abstract'
import { Inject, Injectable } from '@nestjs/common'
import { OracleMapper } from '../../../module.model/oracle'
import { OracleHistory, OracleHistoryMapper } from '../../../module.model/oracle.history'
import { OracleTokenCurrencyMapper } from '../../../module.model/oracle.token.currency'
import { NotFoundIndexerError } from '../../../module.indexer/error'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import { NetworkName } from '@defichain/jellyfish-network'
import { fromScript } from '@defichain/jellyfish-address'

@Injectable()
export class UpdateOracleIndexer extends DfTxIndexer<UpdateOracle> {
  OP_CODE: number = CUpdateOracle.OP_CODE

  constructor (
    private readonly oracleMapper: OracleMapper,
    private readonly oracleHistoryMapper: OracleHistoryMapper,
    private readonly oracleTokenCurrencyMapper: OracleTokenCurrencyMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateOracle>): Promise<void> {
    const txn = transaction.txn
    const data = transaction.dftx.data
    await this.oracleMapper.put({
      id: data.oracleId,
      ownerAddress: fromScript(data.script, this.network)?.address ?? '',
      weightage: data.weightage,
      priceFeeds: data.priceFeeds,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })

    const previous = await this.getPrevious(data.oracleId)
    for (const { token, currency } of previous.priceFeeds) {
      await this.oracleTokenCurrencyMapper.delete(`${token}-${currency}-${data.oracleId}`)
    }

    for (const { token, currency } of data.priceFeeds) {
      await this.oracleTokenCurrencyMapper.put({
        id: `${token}-${currency}-${data.oracleId}`,
        key: `${token}-${currency}`,
        oracleId: data.oracleId,
        token: token,
        currency: currency,
        weightage: data.weightage,
        block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
      })
    }

    await this.oracleHistoryMapper.put({
      id: `${data.oracleId}-${block.height}-${txn.txid}`,
      sort: HexEncoder.encodeHeight(block.height) + txn.txid,
      ownerAddress: fromScript(data.script, this.network)?.address ?? '',
      oracleId: data.oracleId,
      weightage: data.weightage,
      priceFeeds: data.priceFeeds,
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time }
    })
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<UpdateOracle>): Promise<void> {
    const txn = transaction.txn
    const data = transaction.dftx.data
    await this.oracleHistoryMapper.delete(`${data.oracleId}-${block.height}-${txn.txid}`)

    for (const { token, currency } of data.priceFeeds) {
      await this.oracleTokenCurrencyMapper.delete(`${token}-${currency}-${data.oracleId}`)
    }

    const previous = await this.getPrevious(data.oracleId)

    await this.oracleMapper.put({
      id: previous.oracleId,
      ownerAddress: previous.ownerAddress,
      weightage: previous.weightage,
      priceFeeds: previous.priceFeeds,
      block: previous.block
    })

    for (const { token, currency } of previous.priceFeeds) {
      await this.oracleTokenCurrencyMapper.put({
        id: `${token}-${currency}-${previous.oracleId}`,
        key: `${token}-${currency}`,
        token: token,
        currency: currency,
        oracleId: previous.oracleId,
        weightage: previous.weightage,
        block: previous.block
      })
    }
  }

  /**
   * Get previous oracle before current height
   */
  private async getPrevious (oracleId: string): Promise<OracleHistory> {
    const histories = await this.oracleHistoryMapper.query(oracleId, 1)
    if (histories.length === 0) {
      throw new NotFoundIndexerError('index', 'OracleHistory', oracleId)
    }

    return histories[0]
  }
}
