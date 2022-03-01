import { Controller, Get, Query } from '@nestjs/common'
import { NetworkValidationPipe, SupportedNetwork } from '../../pipes/NetworkValidationPipe'
import { LegacyStats, MainnetLegacyStatsProvider, TestnetLegacyStatsProvider } from './LegacyStatsProvider'

@Controller('v1')
export class StatsController {
  constructor (
    private readonly mainnetStatsProvider: MainnetLegacyStatsProvider,
    private readonly testnetStatsProvider: TestnetLegacyStatsProvider) {
  }

  @Get('stats')
  async stats (
    @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
    @Query('q') jsonPath?: string
  ): Promise<LegacyStats> {
    switch (network) {
      case 'mainnet':
        return await this.mainnetStatsProvider.getStats(jsonPath)
      case 'testnet':
        return await this.testnetStatsProvider.getStats(jsonPath)
    }
  }
}
