
import { Global, Module } from '@nestjs/common'
import { ModelProbeIndicator } from './_ModelProbes'
import { RawBlockMapper } from './RawBlock'
import { BlockMapper } from './Block'
import { ScriptActivityMapper } from './ScriptActivity'
import { ScriptAggregationMapper } from './ScriptAggregation'
import { ScriptUnspentMapper } from './ScriptUnspent'
import { TransactionMapper } from './Transaction'
import { TransactionVinMapper } from './TransactionVin'
import { TransactionVoutMapper } from './TransactionVout'
import { OracleHistoryMapper } from './OracleHistory'
import { OraclePriceAggregatedIntervalMapper } from './OraclePriceAggregatedInterval'
import { OraclePriceAggregatedMapper } from './OraclePriceAggregated'
import { OraclePriceFeedMapper } from './OraclePriceFeed'
import { OracleTokenCurrencyMapper } from './OracleTokenCurrency'
import { OracleMapper } from './Oracle'
import { PriceTickerMapper } from './PriceTicker'
import { MasternodeMapper } from './Masternode'
import { MasternodeStatsMapper } from './MasterNodeStats'
import { TokenMapper } from './Token'
import { PoolPairHistoryMapper } from './PoolPairHistory'
import { PoolPairTokenMapper } from './PoolPairToken'
import { OraclePriceActiveMapper } from './OraclePriceActive'
import { VaultAuctionHistoryMapper } from './VaultAuctionBatchHistory'
import { PoolSwapAggregatedMapper } from './PoolSwapAggregated'
import { PoolSwapMapper } from './PoolSwap'

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
