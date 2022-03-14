import {
  BlockSubsidy,
  MainNetCoinbaseSubsidyOptions,
  NetworkName,
  TestNetCoinbaseSubsidyOptions
} from '@defichain/jellyfish-network'
import { CacheModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'

import { DeFiDCache } from '../cache/DeFiDCache'
import { SemaphoreCache } from '../cache/SemaphoreCache'
import { ActuatorController } from '../controllers/ActuatorController'
import { AddressController } from '../controllers/AddressController'
import { BlockController } from '../controllers/BlockController'
import { FeeController } from '../controllers/FeeController'
import { LoanController } from '../controllers/LoanController'
import { MasternodeController } from '../controllers/MasternodeController'
import { OracleController } from '../controllers/OracleController'
import { PoolPairController } from '../controllers/PoolpairController'
import { PriceController } from '../controllers/PriceController'
import { RawtxController } from '../controllers/RawTxController'
import { TransactionController } from '../controllers/TransactionController'
import { TokenController } from '../controllers/TokenController'
import { StatsController } from '../controllers/StatsController'
import { RpcController } from '../controllers/RpcController'
import { ExceptionInterceptor } from '../interceptors/ExceptionInterceptor'
import { ResponseInterceptor } from '../interceptors/ResponseInterceptor'
import { ApiValidationPipe } from '../pipes/ApiValidationPipe'
import { LoanVaultService } from '../services/LoanVaultService'
import { PoolPairService } from '../services/PoolPairService'
import { MasternodeService } from '../services/MasternodeService'

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
