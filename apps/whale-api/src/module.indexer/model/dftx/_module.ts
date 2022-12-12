import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from './appoint.oracle'
import { RemoveOracleIndexer } from './remove.oracle'
import { UpdateOracleIndexer } from './update.oracle'
import { SetOracleDataIndexer } from './set.oracle.data'
import { SetOracleDataIntervalIndexer } from './set.oracle.data.interval'
import { CreateMasternodeIndexer } from './create.masternode'
import { ResignMasternodeIndexer } from './resign.masternode'
import { UpdateMasternodeIndexer } from './update.masternode'
import { NetworkName } from '@defichain/jellyfish-network'
import { ConfigService } from '@nestjs/config'
import { PoolSwapIndexer } from './pool.swap'
import { CompositeSwapIndexer } from './composite.swap'
import { ActivePriceIndexer } from './active.price'
import { PlaceAuctionBidIndexer } from './place.auction.bid'
import { PoolSwapAggregatedIndexer } from './pool.swap.aggregated'
import { PoolPairPathMapping } from './pool.pair.path.mapping'

const indexers = [
  AppointOracleIndexer,
  RemoveOracleIndexer,
  SetOracleDataIndexer,
  SetOracleDataIntervalIndexer,
  UpdateOracleIndexer,
  CreateMasternodeIndexer,
  ResignMasternodeIndexer,
  UpdateMasternodeIndexer,
  PoolSwapIndexer,
  PoolSwapAggregatedIndexer,
  CompositeSwapIndexer,
  ActivePriceIndexer,
  PlaceAuctionBidIndexer
]

@Module({
  providers: [
    ...indexers,
    PoolPairPathMapping,
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    }
  ],
  exports: indexers
})
export class DfTxIndexerModule {
}
