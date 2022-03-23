import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from '../../../module.indexer/model/dftx/appoint.oracle'
import { RemoveOracleIndexer } from '../../../module.indexer/model/dftx/remove.oracle'
import { UpdateOracleIndexer } from '../../../module.indexer/model/dftx/update.oracle'
import { SetOracleDataIndexer } from '../../../module.indexer/model/dftx/set.oracle.data'
import { SetOracleDataIntervalIndexer } from '../../../module.indexer/model/dftx/set.oracle.data.interval'
import { CreateMasternodeIndexer } from '../../../module.indexer/model/dftx/create.masternode'
import { ResignMasternodeIndexer } from '../../../module.indexer/model/dftx/resign.masternode'
import { CreateTokenIndexer } from '../../../module.indexer/model/dftx/create.token'
import { CreatePoolPairIndexer } from '../../../module.indexer/model/dftx/create.pool.pair'
import { UpdatePoolPairIndexer } from '../../../module.indexer/model/dftx/update.pool.pair'
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
