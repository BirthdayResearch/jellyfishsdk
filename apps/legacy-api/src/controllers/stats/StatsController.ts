import { Controller, Get, Query, Res } from '@nestjs/common'
import { NetworkValidationPipe, SupportedNetwork } from '../../pipes/NetworkValidationPipe'
import { LegacyStats, MainnetLegacyStatsProvider, TestnetLegacyStatsProvider } from './LegacyStatsProvider'
import { FastifyReply } from 'fastify'

@Controller('v1')
export class StatsController {
  constructor (
    private readonly mainnetStatsProvider: MainnetLegacyStatsProvider,
    private readonly testnetStatsProvider: TestnetLegacyStatsProvider) {
  }

  @Get('stats')
  async stats (
    @Res() res: FastifyReply,
      @Query('network', NetworkValidationPipe) network: SupportedNetwork = 'mainnet',
      @Query('q') jsonPath?: string
  ): Promise<void> {
    let stats
    switch (network) {
      case 'mainnet':
        stats = await this.mainnetStatsProvider.getStats(jsonPath)
        break
      case 'testnet':
        stats = await this.testnetStatsProvider.getStats(jsonPath)
        break
    }
    await StatsController.replyWithContentType(res, stats)
  }

  private static async replyWithContentType (
    res: FastifyReply,
    stats: LegacyStats | any
  ): Promise<void> {
    switch (typeof stats) {
      case 'number':
      case 'string':
        await res
          .header('content-type', 'text; charset=utf-8')
          .send(stats.toString())
        break

      case 'object':
      default:
        await res
          .header('content-type', 'application/json; charset=utf-8')
          .send(JSON.stringify(stats))
        break
    }
  }
}
