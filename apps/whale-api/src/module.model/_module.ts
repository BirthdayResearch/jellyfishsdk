
import { Global, Module } from '@nestjs/common'
import { ModelProbeIndicator } from './_model.probes'
import { RawBlockMapper } from './raw.block'
import { BlockMapper } from './block'
import { ScriptActivityMapper } from './script.activity'
import { ScriptAggregationMapper } from './script.aggregation'
import { ScriptUnspentMapper } from './script.unspent'
import { TransactionMapper } from './transaction'
import { TransactionVinMapper } from './transaction.vin'
import { TransactionVoutMapper } from './transaction.vout'
import { OracleHistoryMapper } from './oracle.history'
import { OraclePriceAggregatedIntervalMapper } from './oracle.price.aggregated.interval'
import { OraclePriceAggregatedMapper } from './oracle.price.aggregated'
import { OraclePriceFeedMapper } from './oracle.price.feed'
import { OracleTokenCurrencyMapper } from './oracle.token.currency'
import { OracleMapper } from './oracle'
import { PriceTickerMapper } from './price.ticker'
import { MasternodeMapper } from './masternode'
import { MasternodeStatsMapper } from './masternode.stats'
import { OraclePriceActiveMapper } from './oracle.price.active'
import { VaultAuctionHistoryMapper } from './vault.auction.batch.history'
import { PoolSwapAggregatedMapper } from './pool.swap.aggregated'
import { PoolSwapMapper } from './pool.swap'
import { FutureSwapMapper } from './future.swap'

@Global()
@Module({
  providers: [
    ModelProbeIndicator,
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper,
    OracleHistoryMapper,
    OraclePriceAggregatedMapper,
    OraclePriceAggregatedIntervalMapper,
    OraclePriceFeedMapper,
    OracleTokenCurrencyMapper,
    OracleMapper,
    OraclePriceActiveMapper,
    PriceTickerMapper,
    MasternodeMapper,
    MasternodeStatsMapper,
    PoolSwapMapper,
    PoolSwapAggregatedMapper,
    VaultAuctionHistoryMapper,
    FutureSwapMapper
  ],
  exports: [
    ModelProbeIndicator,
    RawBlockMapper,
    BlockMapper,
    ScriptActivityMapper,
    ScriptAggregationMapper,
    ScriptUnspentMapper,
    TransactionMapper,
    TransactionVinMapper,
    TransactionVoutMapper,
    OracleHistoryMapper,
    OraclePriceAggregatedMapper,
    OraclePriceAggregatedIntervalMapper,
    OraclePriceFeedMapper,
    OracleTokenCurrencyMapper,
    OracleMapper,
    OraclePriceActiveMapper,
    PriceTickerMapper,
    MasternodeMapper,
    MasternodeStatsMapper,
    PoolSwapMapper,
    PoolSwapAggregatedMapper,
    VaultAuctionHistoryMapper,
    FutureSwapMapper
  ]
})
export class ModelModule {
}
