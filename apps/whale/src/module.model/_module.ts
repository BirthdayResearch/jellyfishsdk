
import { Global, Module } from '@nestjs/common'
import { ModelProbeIndicator } from '../module.model/_model.probes'
import { RawBlockMapper } from '../module.model/raw.block'
import { BlockMapper } from '../module.model/block'
import { ScriptActivityMapper } from '../module.model/script.activity'
import { ScriptAggregationMapper } from '../module.model/script.aggregation'
import { ScriptUnspentMapper } from '../module.model/script.unspent'
import { TransactionMapper } from '../module.model/transaction'
import { TransactionVinMapper } from '../module.model/transaction.vin'
import { TransactionVoutMapper } from '../module.model/transaction.vout'
import { OracleHistoryMapper } from '../module.model/oracle.history'
import { OraclePriceAggregatedIntervalMapper } from '../module.model/oracle.price.aggregated.interval'
import { OraclePriceAggregatedMapper } from '../module.model/oracle.price.aggregated'
import { OraclePriceFeedMapper } from '../module.model/oracle.price.feed'
import { OracleTokenCurrencyMapper } from '../module.model/oracle.token.currency'
import { OracleMapper } from '../module.model/oracle'
import { PriceTickerMapper } from '../module.model/price.ticker'
import { MasternodeMapper } from '../module.model/masternode'
import { MasternodeStatsMapper } from '../module.model/masternode.stats'
import { TokenMapper } from '../module.model/token'
import { PoolPairHistoryMapper } from '../module.model/pool.pair.history'
import { PoolPairTokenMapper } from '../module.model/pool.pair.token'
import { OraclePriceActiveMapper } from './oracle.price.active'
import { VaultAuctionHistoryMapper } from './vault.auction.batch.history'
import { PoolSwapAggregatedMapper } from './pool.swap.aggregated'
import { PoolSwapMapper } from './pool.swap'

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
    TokenMapper,
    PoolPairHistoryMapper,
    PoolPairTokenMapper,
    PoolSwapMapper,
    PoolSwapAggregatedMapper,
    VaultAuctionHistoryMapper
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
    TokenMapper,
    PoolPairHistoryMapper,
    PoolPairTokenMapper,
    PoolSwapMapper,
    PoolSwapAggregatedMapper,
    VaultAuctionHistoryMapper
  ]
})
export class ModelModule {
}
