import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { CacheModule, Module } from '@nestjs/common'
import { RpcController } from './RpcController'
import { ActuatorController } from './ActuatorController'
import { TransactionController } from './TransactionController'
import { ApiValidationPipe } from './pipes/ApiValidationPipe'
import { AddressController } from './AddressController'
import { PoolPairController } from './PoolPairController'
import { PoolPairService, PoolSwapPathFindingService } from './PoolPairService'
import { MasternodeService } from './MasternodeService'
import { DeFiDCache } from './cache/DeFiDCache'
import { SemaphoreCache } from './cache/SemaphoreCache'
import { ExceptionInterceptor } from './interceptors/ExceptionInterceptor'
import { ResponseInterceptor } from './interceptors/ResponseInterceptor'
import { TokenController } from './TokenController'
import { BlockController } from './BlockController'
import { MasternodeController } from './MasternodeController'
import { ConfigService } from '@nestjs/config'
import {
  BlockSubsidy,
  MainNetCoinbaseSubsidyOptions,
  NetworkName,
  TestNetCoinbaseSubsidyOptions
} from '@defichain/jellyfish-network'
import { OracleController } from './OracleController'
import { PriceController } from './PriceController'
import { StatsController } from './StatsController'
import { FeeController } from './FeeController'
import { RawtxController } from './RawtxController'
import { LoanController } from './LoanController'
import { LoanVaultService } from './LoanVaultService'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [CacheModule.register()],
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
    LoanController
  ],
  providers: [
    { provide: APP_PIPE, useClass: ApiValidationPipe },
    // APP_INTERCEPTOR are only activated for /v* paths
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ExceptionInterceptor },
    {
      provide: 'NETWORK',
      useFactory: (configService: ConfigService): NetworkName => {
        return configService.get<string>('network') as NetworkName
      },
      inject: [ConfigService]
    },
    DeFiDCache,
    SemaphoreCache,
    PoolPairService,
    PoolSwapPathFindingService,
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
    }
  ]
})
export class ApiModule {
}
