import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core'
import { CacheModule, Module } from '@nestjs/common'
import { RpcController } from '@src/module.api/rpc.controller'
import { HealthController } from '@src/module.api/health.controller'
import { TransactionsController } from '@src/module.api/transactions.controller'
import { ApiValidationPipe } from '@src/module.api/pipes/api.validation.pipe'
import { AddressController } from '@src/module.api/address.controller'
import { PoolPairController } from '@src/module.api/poolpair.controller'
import { TokenInfoCache } from '@src/module.api/cache/token.info.cache'
import { PoolPairInfoCache } from '@src/module.api/cache/poolpair.info.cache'
import { NetworkGuard } from '@src/module.api/guards/network.guard'
import { ExceptionInterceptor } from '@src/module.api/interceptors/exception.interceptor'
import { ResponseInterceptor } from '@src/module.api/interceptors/response.interceptor'
import { TokensController } from '@src/module.api/tokens.controller'

/**
 * Exposed ApiModule for public interfacing
 */
@Module({
  imports: [CacheModule.register()],
  controllers: [
    RpcController,
    AddressController,
    HealthController,
    TransactionsController,
    TokensController,
    PoolPairController
  ],
  providers: [
    { provide: APP_PIPE, useClass: ApiValidationPipe },
    // APP_GUARD & APP_INTERCEPTOR are only activated for /v1/* paths
    { provide: APP_GUARD, useClass: NetworkGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ExceptionInterceptor },
    TokenInfoCache,
    PoolPairInfoCache
  ]
})
export class ApiModule {
}
