import { DfTxIndexer, DfTxTransaction } from '@src/module.indexer/model/dftx/_abstract'
import { CSetOracleData, SetOracleData } from '@defichain/jellyfish-transaction'
import { RawBlock } from '@src/module.indexer/model/_abstract'
import { Injectable } from '@nestjs/common'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import {
  OracleIntervalSeconds,
  OraclePriceAggregatedIntervalMapper
} from '@src/module.model/oracle.price.aggregated.interval'
import BigNumber from 'bignumber.js'
import { mapPriceFeeds } from './set.oracle.data'

@Injectable()
export class SetOracleDataIntervalIndexer extends DfTxIndexer<SetOracleData> {
  OP_CODE: number = CSetOracleData.OP_CODE
  intervals: OracleIntervalSeconds[] = [
    OracleIntervalSeconds.FIVE_MINUTES,
    OracleIntervalSeconds.TEN_MINUTES,
    OracleIntervalSeconds.ONE_HOUR,
    OracleIntervalSeconds.ONE_DAY
  ]

  constructor (
    private readonly aggregatedMapper: OraclePriceAggregatedMapper,
    private readonly aggregatedIntervalMapper: OraclePriceAggregatedIntervalMapper
  ) {
    super()
  }

  async index (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): Promise<void> {
    const feeds = mapPriceFeeds(block, txns)
    const pairs = new Set<[string, string]>()

    for (const feed of feeds) {
      pairs.add([feed.token, feed.currency])
    }

    for (const [token, currency] of pairs) {
      const aggregated = await this.aggregatedMapper.get(`${token}-${currency}-${block.height}`)
      if (aggregated === undefined) {
        continue
      }

      for (const interval of this.intervals) {
        await this.indexIntervalMapper(block, token, currency, aggregated, interval)
      }
    }
  }

  private async indexIntervalMapper (block: RawBlock, token: string, currency: string, aggregated: OraclePriceAggregated,
    interval: OracleIntervalSeconds): Promise<void> {
    const previous = await this.aggregatedIntervalMapper.query(`${token}-${currency}-${interval}`, 1)
    // Start a new bucket
    if (previous.length === 0 || (block.mediantime - previous[0].block.medianTime) > (interval as number)) {
      await this.startNewBucket(block, token, currency, aggregated, interval)
    } else {
      // Forward aggregate
      const lastPrice = previous[0].aggregated
      const count = lastPrice.count + 1

      await this.aggregatedIntervalMapper.put({
        block: previous[0].block,
        currency: previous[0].currency,
        token: previous[0].token,
        aggregated: {
          weightage: this.forwardAggregateValue(lastPrice.weightage, aggregated.aggregated.weightage, lastPrice.count).toNumber(),
          oracles: {
            active: this.forwardAggregateValue(lastPrice.oracles.active, aggregated.aggregated.oracles.active, lastPrice.count).toNumber(),
            total: this.forwardAggregateValue(lastPrice.oracles.total, aggregated.aggregated.oracles.total, lastPrice.count).toNumber()
          },
          amount: this.forwardAggregateValue(lastPrice.amount, aggregated.aggregated.amount, lastPrice.count).toFixed(8),
          count: count
        },
        id: previous[0].id,
        key: previous[0].key,
        sort: previous[0].sort
      })
    }
  }

  private async startNewBucket (block: RawBlock, token: string, currency: string,
    aggregated: OraclePriceAggregated, interval: OracleIntervalSeconds): Promise<void> {
    await this.aggregatedIntervalMapper.put({
      block: aggregated.block,
      currency: aggregated.currency,
      token: aggregated.token,
      aggregated: {
        weightage: aggregated.aggregated.weightage,
        oracles: aggregated.aggregated.oracles,
        amount: aggregated.aggregated.amount,
        count: 1
      },
      id: `${token}-${currency}-${interval}-${block.height}`,
      key: `${token}-${currency}-${interval}`,
      sort: aggregated.sort
    })
  }

  private forwardAggregateValue (lastValue: string|number, newValue: string|number, count: number): BigNumber {
    return new BigNumber(lastValue).times(count).plus(newValue).dividedBy(count + 1)
  }

  private backwardAggregateValue (lastValue: string|number, newValue: string|number, count: number): BigNumber {
    return new BigNumber(lastValue).times(count).minus(newValue).dividedBy(count - 1)
  }

  async invalidate (block: RawBlock, txns: Array<DfTxTransaction<SetOracleData>>): Promise<void> {
    const feeds = mapPriceFeeds(block, txns)
    const pairs = new Set<[string, string]>()

    for (const feed of feeds) {
      pairs.add([feed.token, feed.currency])
    }

    for (const [token, currency] of pairs) {
      const aggregated = await this.aggregatedMapper.get(`${token}-${currency}-${block.height}`)
      if (aggregated === undefined) {
        continue
      }

      for (const interval of this.intervals) {
        await this.invalidateIntervalMapper(block, token, currency, aggregated, interval)
      }
      // price ticker won't be deleted
    }
  }

  async invalidateIntervalMapper (block: RawBlock, token: string, currency: string, aggregated: OraclePriceAggregated,
    interval: OracleIntervalSeconds): Promise<void> {
    const previous = await this.aggregatedIntervalMapper.query(`${token}-${currency}-${interval}`, 1)
    // If count is 1 just delete
    if (previous[0].aggregated.count === 1) {
      await this.aggregatedIntervalMapper.delete(previous[0].id)
    } else {
      // Reverse forward aggregate
      const lastPrice = previous[0].aggregated
      const count = lastPrice.count - 1

      await this.aggregatedIntervalMapper.put({
        block: previous[0].block,
        currency: previous[0].currency,
        token: previous[0].token,
        aggregated: {
          weightage: this.backwardAggregateValue(lastPrice.weightage, aggregated.aggregated.weightage, lastPrice.count).toNumber(),
          oracles: {
            active: this.backwardAggregateValue(lastPrice.oracles.active, aggregated.aggregated.oracles.active, lastPrice.count).toNumber(),
            total: this.backwardAggregateValue(lastPrice.oracles.total, aggregated.aggregated.oracles.total, lastPrice.count).toNumber()
          },
          amount: this.backwardAggregateValue(lastPrice.amount, aggregated.aggregated.amount, lastPrice.count).toFixed(8),
          count: count
        },
        id: previous[0].id,
        key: previous[0].key,
        sort: previous[0].sort
      })
    }
  }
}
