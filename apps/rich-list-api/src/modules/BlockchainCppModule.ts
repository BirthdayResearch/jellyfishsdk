import { Global, Module } from '@nestjs/common'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ConfigService } from '@nestjs/config'
import { ApiClient } from '@defichain/jellyfish-api-core'
import { ActuatorProbes, BlockchainCppProbeIndicator } from '@defichain-apps/libs/actuator'

/**
 * Ain Module configures and export JsonRpcClient connected to a DeFiD.
 * This does not have any side effect it merely configures and export a JsonRpcClient.
 */
@Global()
@Module({
  providers: [
    BlockchainCppProbeIndicator,
    {
      provide: ApiClient,
      useFactory: (configService: ConfigService): ApiClient => {
        const url = configService.get<string>('BLOCKCHAIN_CPP_URL')
        if (url === undefined) {
          throw new Error('BlockchainCppModule config:BLOCKCHAIN_CPP_URL not provided')
        }
        return new JsonRpcClient(configService.get<string>('BLOCKCHAIN_CPP_URL') as string)
      },
      inject: [ConfigService]
    }
  ],
  exports: [
    ApiClient
  ]
})
export class BlockchainCppModule {
  constructor (
    private readonly probes: ActuatorProbes,
    private readonly ainProbeIndicator: BlockchainCppProbeIndicator
  ) {
  }

  async onApplicationBootstrap (): Promise<void> {
    this.probes.add(this.ainProbeIndicator)
  }
}
