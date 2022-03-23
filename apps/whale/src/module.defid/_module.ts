import { Global, Module } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ConfigService } from '@nestjs/config'
import { FactoryProvider } from '@nestjs/common/interfaces/modules/provider.interface'
import { DeFiDProbeIndicator } from '../module.defid/defid.probes'

const JsonRpcClientFactory: FactoryProvider = {
  provide: JsonRpcClient,
  useFactory: (configService: ConfigService) => {
    const url = configService.get<string>('defid.url')
    if (url === undefined) {
      throw new Error('bootstrapping error: missing config in app.configuration.ts - defid.url is not configured')
    }
    return new JsonRpcClient(url)
  },
  inject: [ConfigService]
}

/**
 * DeFiD module configures and export JsonRpcClient connected to a DeFiD.
 * This does not has any side-effect it merely configures and export a JsonRpcClient.
 */
@Global()
@Module({
  providers: [
    JsonRpcClientFactory,
    DeFiDProbeIndicator
  ],
  exports: [
    JsonRpcClient,
    DeFiDProbeIndicator
  ]
})
export class DeFiDModule {
}
