import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CSetOracleData, SetOracleData } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import { OraclePriceFeed, OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { HexEncoder } from '@src/module.model/_hex.encoder'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import BigNumber from 'bignumber.js'
import { PriceTickerMapper } from '@src/module.model/price.ticker'

@Injectable()
export class SetOracleDataIndexer extends DfTxIndexer<SetOracleData> {
  OP_CODE: number = CSetOracleData.OP_CODE

  constructor (
    private readonly feedMapper: OraclePriceFeedMapper,
    private readonly aggregatedMapper: OraclePriceAggregatedMapper,
    private readonly tokenCurrencyMapper: OracleTokenCurrencyMapper,
    private readonly priceTickerMapper: PriceTickerMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): Promise<void> {
    const feeds = mapPriceFeeds(block, txns)
    const pairs = new Set<[string, string]>()

    for (const feed of feeds) {
      pairs.add([feed.token, feed.currency])
      await this.feedMapper.put(feed)
    }

    for (const [token, currency] of pairs) {
      const aggregated = await this.mapPriceAggregated(block, token, currency)
      if (aggregated === undefined) {
        continue
      }

      await this.aggregatedMapper.put(aggregated)
      await this.priceTickerMapper.put({
        id: aggregated.key,
        sort: HexEncoder.encodeHeight(aggregated.aggregated.oracles.total) + HexEncoder.encodeHeight(aggregated.block.height) + aggregated.key,
        price: aggregated
      })
    }
  }

  private async mapPriceAggregated (block: RawBlock, token: string, currency: string): Promise<OraclePriceAggregated | undefined> {
    const oracles = await this.tokenCurrencyMapper.query(`${token}-${currency}`, Number.MAX_SAFE_INTEGER)

    const aggregated = {
      total: new BigNumber(0),
      count: 0,
      weightage: 0
    }

    for (const oracle of oracles) {
      if (oracle.weightage === 0) {
        continue
      }
      const key = `${token}-${currency}-${oracle.oracleId}`
      const feeds = await this.feedMapper.query(key, 1)
      if (feeds.length === 0) {
        continue
      }

      // one hour -/+ time frame
      if (Math.abs(feeds[0].time - block.time) < 3600) {
        aggregated.count += 1
        aggregated.weightage += oracle.weightage
        aggregated.total = aggregated.total.plus(new BigNumber(feeds[0].amount).multipliedBy(oracle.weightage))
      }
    }

    if (aggregated.count === 0) {
      return undefined
    }

    return {
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
      aggregated: {
        amount: aggregated.total.dividedBy(aggregated.weightage).toFixed(8),
        weightage: aggregated.weightage,
        oracles: {
          active: aggregated.count,
          total: oracles.length
        }
      },
      currency: currency,
      token: token,
      id: `${token}-${currency}-${block.height}`,
      key: `${token}-${currency}`,
      sort: HexEncoder.encodeHeight(block.mediantime) + HexEncoder.encodeHeight(block.height)
    }
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): Promise<void> {
    const feeds = mapPriceFeeds(block, txns)
    const pairs = new Set<[string, string]>()

    for (const feed of feeds) {
      pairs.add([feed.token, feed.currency])
      await this.feedMapper.delete(feed.id)
    }

    for (const [token, currency] of pairs) {
      await this.aggregatedMapper.delete(`${token}-${currency}-${block.height}`)
      // price ticker won't be deleted
    }
  }
}

export function mapPriceFeeds (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): OraclePriceFeed[] {
  return txns.map(({ txn, dftx: { data } }) => {
    return data.tokens.map((tokenPrice) => {
      return tokenPrice.prices.map((tokenAmount): OraclePriceFeed => {
        return {
          id: `${tokenPrice.token}-${tokenAmount.currency}-${data.oracleId}-${txn.txid}`,
          key: `${tokenPrice.token}-${tokenAmount.currency}-${data.oracleId}`,
          sort: HexEncoder.encodeHeight(block.height) + txn.txid,
          amount: tokenAmount.amount.toFixed(),
          currency: tokenAmount.currency,
          block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
          oracleId: data.oracleId,
          time: data.timestamp.toNumber(),
          token: tokenPrice.token,
          txid: txn.txid
        }
      })
    })
  }).flat(2)
}
