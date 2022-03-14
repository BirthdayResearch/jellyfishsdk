import { Global, Module } from '@nestjs/common'

import { BlockMapper } from '../models/Block'
import { MasternodeMapper } from '../models/Masternode'
import { MasternodeStatsMapper } from '../models/MasternodeStats'
import { ModelProbeIndicator } from '../probes/ModelProbeIndicator'
import { OracleHistoryMapper } from '../models/OracleHistory'
import { OraclePriceAggregatedMapper } from '../models/OraclePriceAggregated'
import { OraclePriceFeedMapper } from '../models/OraclePriceFeed'
import { OracleTokenCurrencyMapper } from '../models/OracleTokenCurrency'
import { OracleMapper } from '../models/Oracle'
import { OraclePriceActiveMapper } from '../models/OraclePriceActive'
import { PoolPairHistoryMapper } from '../models/PoolPairHistory'
import { PoolPairTokenMapper } from '../models/PoolPairToken'
import { PoolSwapAggregatedMapper } from '../models/PoolSwapAggregated'
import { PoolSwapMapper } from '../models/PoolSwap'
import { PriceTickerMapper } from '../models/PriceTicker'
import { RawBlockMapper } from '../models/RawBlock'
import { ScriptActivityMapper } from '../models/ScriptActivity'
import { ScriptAggregationMapper } from '../models/ScriptAggregation'
import { ScriptUnspentMapper } from '../models/ScriptUnspent'
import { TokenMapper } from '../models/Token'
import { TransactionMapper } from '../models/Transaction'
import { TransactionVinMapper } from '../models/TransactionVin'
import { TransactionVoutMapper } from '../models/TransactionVout'
import { VaultAuctionHistoryMapper } from '../models/VaultAuctionBatchHistory'

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
