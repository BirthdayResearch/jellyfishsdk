import { Global, Module } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ConfigService } from '@nestjs/config'
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface'
import { ApiClient } from '@defichain/jellyfish-api-core'

const ApiClientFactory: FactoryProvider = {
  provide: ApiClient,
  useFactory: (configService: ConfigService): ApiClient => {
    const url = configService.get<string>('FULL_NODE_URL')
    if (url === undefined) {
      throw new Error('FullNodeModule config:FULL_NODE_URL not provided')
    }

    return new JsonRpcClient(configService.get<string>('FULL_NODE_URL') as string)
  },
  inject: [ConfigService]
}

/**
 * Full Node Module configures and export JsonRpcClient connected to a DeFiD.
 * This does not has any side-effect it merely configures and export a JsonRpcClient.
 */
@Global()
@Module({
  providers: [
    ApiClientFactory
  ],
  exports: [
    ApiClient
  ]
})
export class FullNodeModule {
}

// TODO(fuxingloh): DeFiDProbeIndicator
