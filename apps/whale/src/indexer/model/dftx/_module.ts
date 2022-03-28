import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from '../../model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '../../model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '../../model/dftx/update.oracle'
import { SetOracleDataIndexer } from '../../model/dftx/set.oracle.data'
import { SetOracleDataIntervalIndexer } from '../../model/dftx/set.oracle.data.interval'
import { CreateMasternodeIndexer } from '../../model/dftx/create.masternode'
import { ResignMasternodeIndexer } from '../../model/dftx/resign.masternode'
import { CreateTokenIndexer } from '../../model/dftx/create.token'
import { CreatePoolPairIndexer } from '../../model/dftx/create.pool.pair'
import { UpdatePoolPairIndexer } from '../../model/dftx/update.pool.pair'
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
