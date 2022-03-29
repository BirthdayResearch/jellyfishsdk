import { Module } from '@nestjs/common'
import { AppointOracleIndexer } from './AppointOracle'
import { RemoveOracleIndexer } from './RemoveOracle'
import { UpdateOracleIndexer } from './UpdateOracle'
import { SetOracleDataIndexer } from './SetOracleData'
import { SetOracleDataIntervalIndexer } from './SetOracleDataInterval'
import { CreateMasternodeIndexer } from './CreateMasternode'
import { ResignMasternodeIndexer } from './ResignMasternode'
import { CreateTokenIndexer } from './CreateToken'
import { CreatePoolPairIndexer } from './CreatePoolPair'
import { UpdatePoolPairIndexer } from './UpdatePoolPair'
import { NetworkName } from '@defichain/jellyfish-network'
import { ConfigService } from '@nestjs/config'
import { PoolSwapIndexer } from './PoolSwap'
import { CompositeSwapIndexer } from './CompositeSwap'
import { SetLoanTokenIndexer } from './SetLoanToken'
import { ActivePriceIndexer } from './ActivePrice'
import { PlaceAuctionBidIndexer } from './PlaceAuctionBid'
import { PoolSwapAggregatedIndexer } from './PoolSwapAggregated'

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
