import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { CacheModule, Module } from '@nestjs/common'
import { RpcController } from '../module.api/rpc.controller'
import { ActuatorController } from '../module.api/actuator.controller'
import { TransactionController } from '../module.api/transaction.controller'
import { ApiValidationPipe } from '../module.api/pipes/api.validation.pipe'
import { AddressController } from '../module.api/address.controller'
import { PoolPairController } from '../module.api/poolpair.controller'
import { PoolPairService, PoolSwapPathFindingService } from '../module.api/poolpair.service'
import { MasternodeService } from '../module.api/masternode.service'
import { DeFiDCache } from '../module.api/cache/defid.cache'
import { SemaphoreCache } from '../module.api/cache/semaphore.cache'
import { ExceptionInterceptor } from '../module.api/interceptors/exception.interceptor'
import { ResponseInterceptor } from '../module.api/interceptors/response.interceptor'
import { TokenController } from '../module.api/token.controller'
import { BlockController } from '../module.api/block.controller'
import { MasternodeController } from '../module.api/masternode.controller'
import { ConfigService } from '@nestjs/config'
import {
  BlockSubsidy,
  MainNetCoinbaseSubsidyOptions,
  NetworkName,
  TestNetCoinbaseSubsidyOptions
} from '@defichain/jellyfish-network'
import { OracleController } from '../module.api/oracle.controller'
import { PriceController } from '../module.api/price.controller'
import { StatsController } from '../module.api/stats.controller'
import { FeeController } from '../module.api/fee.controller'
import { RawtxController } from '../module.api/rawtx.controller'
import { LoanController } from '../module.api/loan.controller'
import { LoanVaultService } from '../module.api/loan.vault.service'

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
