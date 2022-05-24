import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from './appoint.oracle'
import { RemoveOracleIndexer } from './remove.oracle'
import { UpdateOracleIndexer } from './update.oracle'
import { SetOracleDataIndexer } from './set.oracle.data'
import { SetOracleDataIntervalIndexer } from './set.oracle.data.interval'
import { CreateMasternodeIndexer } from './create.masternode'
import { ResignMasternodeIndexer } from './resign.masternode'
import { CreateTokenIndexer } from './create.token'
import { CreatePoolPairIndexer } from './create.pool.pair'
import { UpdatePoolPairIndexer } from './update.pool.pair'
import { NetworkName } from '@defichain/jellyfish-network'
import { ConfigService } from '@nestjs/config'
import { PoolSwapIndexer } from './pool.swap'
import { CompositeSwapIndexer } from './composite.swap'
import { SetLoanTokenIndexer } from './set.loan.token'
import { ActivePriceIndexer } from './active.price'
import { PlaceAuctionBidIndexer } from './place.auction.bid'
import { PoolSwapAggregatedIndexer } from './pool.swap.aggregated'

const indexers = [
  AppointOracleIndexer,
  RemoveOracleIndexer,
  SetOracleDataIndexer,
  SetOracleDataIntervalIndexer,
  UpdateOracleIndexer,
  CreateMasternodeIndexer,
  ResignMasternodeIndexer,
  CreateTokenIndexer,
  CreatePoolPairIndexer,
  UpdatePoolPairIndexer,
  PoolSwapIndexer,
  PoolSwapAggregatedIndexer,
  CompositeSwapIndexer,
  SetLoanTokenIndexer,
  ActivePriceIndexer,
  PlaceAuctionBidIndexer
]

@Module({
  providers: [...indexers,
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    }],
  exports: indexers
})
export class DfTxIndexerModule {
}
