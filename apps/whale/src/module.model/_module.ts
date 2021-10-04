import { Global, Module } from '@nestjs/common'
import { ModelProbeIndicator } from '@src/module.model/_model.probes'
import { RawBlockMapper } from '@src/module.model/raw.block'
import { BlockMapper } from '@src/module.model/block'
import { ScriptActivityMapper } from '@src/module.model/script.activity'
import { ScriptAggregationMapper } from '@src/module.model/script.aggregation'
import { ScriptUnspentMapper } from '@src/module.model/script.unspent'
import { TransactionMapper } from '@src/module.model/transaction'
import { TransactionVinMapper } from '@src/module.model/transaction.vin'
import { TransactionVoutMapper } from '@src/module.model/transaction.vout'
import { OracleHistoryMapper } from '@src/module.model/oracle.history'
import { OraclePriceAggregatedMapper } from '@src/module.model/oracle.price.aggregated'
import {
  OraclePriceAggregatedIntervalMapper
} from '@src/module.model/oracle.price.aggregated.interval'
import { OraclePriceFeedMapper } from '@src/module.model/oracle.price.feed'
import { OracleTokenCurrencyMapper } from '@src/module.model/oracle.token.currency'
import { OracleMapper } from '@src/module.model/oracle'
import { PriceTickerMapper } from '@src/module.model/price.ticker'
import { MasternodeMapper } from '@src/module.model/masternode'
import { MasternodeStatsMapper } from '@src/module.model/masternode.stats'
import { TokenMapper } from '@src/module.model/token'
import { PoolPairMapper } from '@src/module.model/poolpair'
import { PoolPairTokenMapper } from '@src/module.model/poolpair.token'

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
    PriceTickerMapper,
    MasternodeMapper,
    MasternodeStatsMapper,
    TokenMapper,
    PoolPairMapper,
    PoolPairTokenMapper
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
    PriceTickerMapper,
    MasternodeMapper,
    MasternodeStatsMapper,
    TokenMapper,
    PoolPairMapper,
    PoolPairTokenMapper
  ]
})
export class ModelModule {
}
