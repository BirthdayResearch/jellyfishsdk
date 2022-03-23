import { NetworkName } from '@defichain/jellyfish-network'
import { CSetLoanToken, SetLoanToken } from '@defichain/jellyfish-transaction'
import { Inject, Injectable, Logger } from '@nestjs/common'
import { RawBlock } from '../../../module.indexer/model/_abstract'
import { OraclePriceActive, OraclePriceActiveMapper } from '../../../module.model/oracle.price.active'
import { OraclePriceAggregated, OraclePriceAggregatedMapper } from '../../../module.model/oracle.price.aggregated'
import { PriceTickerMapper, PriceTicker } from '../../../module.model/price.ticker'
import { HexEncoder } from '../../../module.model/_hex.encoder'
import BigNumber from 'bignumber.js'
import { DfTxIndexer, DfTxTransaction } from './_abstract'

@Injectable()
export class ActivePriceIndexer extends DfTxIndexer<SetLoanToken> {
  OP_CODE: number = CSetLoanToken.OP_CODE
  private readonly logger = new Logger(ActivePriceIndexer.name)

  BLOCK_INTERVAL: number
  DEVIATION_THRESHOLD: number = 0.3
  MINIMUM_LIVE_ORACLES: number = 2

  constructor (
    private readonly aggregatedMapper: OraclePriceAggregatedMapper,
    private readonly activePriceMapper: OraclePriceActiveMapper,
    private readonly priceTickerMapper: PriceTickerMapper,
    @Inject('NETWORK') protected readonly network: NetworkName
  ) {
    super()
    this.BLOCK_INTERVAL = network === 'regtest' ? 6 : 120
  }

  async indexTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanToken>): Promise<void> {
    const data = transaction.dftx.data
    await this.performActivePriceTick(block, `${data.currencyPair.token}-${data.currencyPair.currency}`)
  }

  async indexBlockEnd (block: RawBlock): Promise<void> {
    if (block.height % this.BLOCK_INTERVAL === 0) {
      await this.performActivePriceTickForAll(block)
      // return early since we updated all the price ticks already
    }
  }

  async performActivePriceTickForAll (block: RawBlock): Promise<void> {
    const tickers: PriceTicker[] = await this.priceTickerMapper.query(Number.MAX_SAFE_INTEGER)
    for (const ticker of tickers) {
      await this.performActivePriceTick(block, ticker.id)
    }
  }

  async performActivePriceTick (block: RawBlock, tickerId: string): Promise<void> {
    const aggregatedPrices = await this.aggregatedMapper.query(tickerId, 1)
    if (aggregatedPrices.length < 1) {
      return
    }

    const previousPrices = await this.activePriceMapper.query(tickerId, 1)
    await this.activePriceMapper.put(this.mapActivePrice(block, tickerId, aggregatedPrices[0], previousPrices[0]))
  }

  private mapActivePrice (
    block: RawBlock,
    tickerId: string,
    aggregatedPrice: OraclePriceAggregated,
    previousActive?: OraclePriceActive
  ): OraclePriceActive {
    const nextPrice = this.isAggregateValid(aggregatedPrice, block) ? aggregatedPrice.aggregated : undefined
    const activePrice = previousActive?.next !== undefined ? previousActive.next : previousActive?.active

    return {
      id: `${tickerId}-${block.height}`,
      key: tickerId,
      isLive: this.isLive(activePrice, nextPrice),
      block: { hash: block.hash, height: block.height, medianTime: block.mediantime, time: block.time },
      active: activePrice,
      next: nextPrice,
      sort: HexEncoder.encodeHeight(block.height)
    }
  }

  private isLive (active: OraclePriceActive['active'],
    next: OraclePriceActive['next']): boolean {
    if (active === undefined || next === undefined) {
      return false
    }

    const activePrice = new BigNumber(active.amount)
    const nextPrice = new BigNumber(next.amount)

    if (!activePrice.gt(0)) {
      return false
    }

    if (!nextPrice.gt(0)) {
      return false
    }

    if (!nextPrice.minus(activePrice).abs().lt(activePrice.times(this.DEVIATION_THRESHOLD))) {
      return false
    }

    return true
  }

  private isAggregateValid (aggregate: OraclePriceAggregated, block: RawBlock): boolean {
    // The last aggregated price (i.e. setOracleData), was more than an hour ago,
    // therefore it's invalid
    if (Math.abs(aggregate.block.time - block.time) >= 3600) {
      return false
    }

    if (aggregate.aggregated.oracles === undefined) {
      return false
    }

    if (aggregate.aggregated.oracles.active < this.MINIMUM_LIVE_ORACLES) {
      return false
    }

    if (aggregate.aggregated.weightage <= 0) {
      return false
    }
    return true
  }

  async invalidateTransaction (block: RawBlock, transaction: DfTxTransaction<SetLoanToken>): Promise<void> {
    const data = transaction.dftx.data
    const tickerId = `${data.currencyPair.token}-${data.currencyPair.currency}`
    await this.activePriceMapper.delete(`${tickerId}-${block.height}`)
  }

  async invalidateBlockEnd (block: RawBlock): Promise<void> {
    if (block.height % this.BLOCK_INTERVAL !== 0) {
      return
    }

    const tickers = await this.priceTickerMapper.query(Number.MAX_SAFE_INTEGER)
    for (const ticker of tickers) {
      try {
        await this.activePriceMapper.delete(`${ticker.id}-${block.height}`)
      } catch (e) {
        // This is a minor edge case when a setLoanToken tx occurs
        // on an interval block, not deleting is fine here as it was
        // already deleted in invalidateTransaction
        this.logger.warn(`Tried to delete ActivePrice entry ${ticker.id}`)
      }
    }
  }
}
