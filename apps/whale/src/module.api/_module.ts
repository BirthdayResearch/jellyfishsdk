import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { CacheModule, Module } from '@nestjs/common'
import { RpcController } from '@src/module.api/rpc.controller'
import { ActuatorController } from '@src/module.api/actuator.controller'
import { TransactionsController } from '@src/module.api/transaction.controller'
import { ApiValidationPipe } from '@src/module.api/pipes/api.validation.pipe'
import { AddressController } from '@src/module.api/address.controller'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { PoolPairService } from '@src/module.api/poolpair.service'
import { DeFiDCache } from '@src/module.api/cache/defid.cache'
import { ExceptionInterceptor } from '@src/module.api/interceptors/exception.interceptor'
import { ResponseInterceptor } from '@src/module.api/interceptors/response.interceptor'
import { TokensController } from '@src/module.api/token.controller'
import { BlockController } from '@src/module.api/block.controller'
import { MasternodesController } from '@src/module.api/masternode.controller'
import { ConfigService } from '@nestjs/config'
import { NetworkName } from '@defichain/jellyfish-network'
import { OraclesController } from '@src/module.api/oracles.controller'
import { PricesController } from '@src/module.api/prices.controller'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [
    RpcController,
    AddressController,
    ActuatorController,
    TransactionsController,
    TokensController,
    PoolPairController,
    MasternodesController,
    BlockController,
    OraclesController,
    PricesController
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
    PoolPairService
  ]
})
export class ApiModule {
}
