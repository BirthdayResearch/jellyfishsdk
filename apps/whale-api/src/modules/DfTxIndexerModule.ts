import { NetworkName } from '@defichain/jellyfish-network'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ActivePriceIndexer } from '../indexer/model/dftx/ActivePriceIndexer'
import { AppointOracleIndexer } from '../indexer/model/dftx/AppointOracleIndexer'
import { CreateMasternodeIndexer } from '../indexer/model/dftx/CreateMasternodeIndexer'
import { CompositeSwapIndexer } from '../indexer/model/dftx/CompositeSwapIndexer'
import { CreatePoolPairIndexer } from '../indexer/model/dftx/CreatePoolPairIndexer'
import { CreateTokenIndexer } from '../indexer/model/dftx/CreateTokenIndexer'
import { PlaceAuctionBidIndexer } from '../indexer/model/dftx/PlaceAuctionBidIndexer'
import { PoolSwapAggregatedIndexer } from '../indexer/model/dftx/PoolSwapAggregatedIndexer'
import { PoolSwapIndexer } from '../indexer/model/dftx/PoolSwapIndexer'
import { RemoveOracleIndexer } from '../indexer/model/dftx/RemoveOracleIndexer'
import { ResignMasternodeIndexer } from '../indexer/model/dftx/ResignMasternodeIndexer'
import { SetLoanTokenIndexer } from '../indexer/model/dftx/SetLoanTokenIndexer'
import { SetOracleDataIndexer } from '../indexer/model/dftx/SetOracleDataIndexer'
import { UpdateOracleIndexer } from '../indexer/model/dftx/UpdateOracleIndexer'
import { UpdatePoolPairIndexer } from '../indexer/model/dftx/UpdatePoolPairIndexer'

const indexers = [
  AppointOracleIndexer,
  RemoveOracleIndexer,
  SetOracleDataIndexer,
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
