import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { CacheModule, Global, Module } from '@nestjs/common'
import { RpcController } from './rpc.controller'
import { ActuatorController } from './actuator.controller'
import { TransactionController } from './transaction.controller'
import { DebugController } from './debug.controller'
import { ApiValidationPipe } from './pipes/api.validation.pipe'
import { AddressController } from './address.controller'
import { PoolPairController } from './poolpair.controller'
import { PoolPairService } from './poolpair.service'
import { MasternodeService } from './masternode.service'
import { DeFiDCache } from './cache/defid.cache'
import { SemaphoreCache, LegacyCache } from '@defichain-apps/libs/caches'
import { ExceptionInterceptor } from './interceptors/exception.interceptor'
import { ResponseInterceptor } from './interceptors/response.interceptor'
import { TokenController } from './token.controller'
import { BlockController } from './block.controller'
import { MasternodeController } from './masternode.controller'
import { ConfigService } from '@nestjs/config'
import {
  BlockSubsidy,
  MainNetCoinbaseSubsidyOptions,
  NetworkName,
  TestNetCoinbaseSubsidyOptions
} from '@defichain/jellyfish-network'
import { OracleController } from './oracle.controller'
import { PriceController } from './price.controller'
import { StatsController } from './stats.controller'
import { FeeController } from './fee.controller'
import { RawtxController } from './rawtx.controller'
import { LoanController } from './loan.controller'
import { LoanVaultService } from './loan.vault.service'
import { PoolSwapPathFindingService } from './poolswap.pathfinding.service'
import { PoolPairPricesService } from './poolpair.prices.service'
import { LegacyController } from './legacy.controller'
import { LegacySubgraphService } from './legacy.subgraph.service'
import { PoolPairFeesService } from './poolpair.fees.service'
import { ConsortiumController } from './consortium.controller'
import { ConsortiumService } from './consortium.service'
import { GovernanceController } from './governance.controller'
import { GovernanceService } from './governance.service'

/**
 * Exposed ApiModule for public interfacing
 */
@Global()
@Module({
  imports: [CacheModule.register({ max: 10_000 })],
  controllers: [
    RpcController,
    AddressController,
    ActuatorController,
    TransactionController,
    TokenController,
    PoolPairController,
    MasternodeController,
    BlockController,
    OracleController,
    PriceController,
    StatsController,
    FeeController,
    RawtxController,
    LoanController,
    LegacyController,
    ConsortiumController,
    DebugController,
    GovernanceController
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ApiValidationPipe
    },
    // APP_INTERCEPTOR are only activated for /v* paths
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ExceptionInterceptor
    },
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    },
    DeFiDCache,
    SemaphoreCache,
    LegacyCache,
    PoolPairService,
    PoolSwapPathFindingService,
    PoolPairPricesService,
    PoolPairFeesService,
    MasternodeService,
    LoanVaultService,
    {
      provide: BlockSubsidy,
      useFactory: (configService: ConfigService): BlockSubsidy => {
        switch (configService.get<string>('network')) {
          case 'mainnet':
            return new BlockSubsidy(MainNetCoinbaseSubsidyOptions)
          default:
            return new BlockSubsidy(TestNetCoinbaseSubsidyOptions)
        }
      },
      inject: [ConfigService]
    },
    LegacySubgraphService,
    ConsortiumService,
    GovernanceService
  ],
  exports: [
    DeFiDCache
  ]
})
export class ApiModule {
}
