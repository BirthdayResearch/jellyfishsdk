import { Logger, Module } from '@nestjs/common'
import { RpcBlockProvider } from './RpcBlockProvider'

@Module({
  providers: [
    RpcBlockProvider
  ]
})
export class IndexerModule {
  private readonly logger = new Logger(IndexerModule.name)

  constructor (private readonly provider: RpcBlockProvider) {
  }

  async onApplicationBootstrap (): Promise<void> {
    await this.provider.start()
    this.logger.log('Started IndexerModule')
  }

  async beforeApplicationShutdown (): Promise<void> {
    await this.provider.stop()
    this.logger.log('Stopped IndexerModule gracefully')
  }
}
