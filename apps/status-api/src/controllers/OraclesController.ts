import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { Oracle } from '@defichain/whale-api-client/dist/api/Oracles'
import { SemaphoreCache } from '../../../whale/src/module.api/cache/semaphore.cache'

@Controller('/status')
export class OraclesController {
  constructor (
    private readonly client: WhaleApiClient,
    protected readonly cache: SemaphoreCache
  ) {
  }

  @Get('oracles')
  async getToken (
    @Query('address') oracleAddress: string
  ): Promise<{ [key: string]: string }> {
    const oracle: Oracle = await this.cachedGet('ORACLE', async () => {
      return await this.client.oracles.getOracleByAddress(oracleAddress)
    }, 1000)

    const nowEpoch = Date.now()
    const latestPublishedTime = oracle.block.medianTime * 1000
    const timeDiff = nowEpoch - latestPublishedTime

    return {
      status: timeDiff > (15 * 60 * 1000) ? 'operational' : 'outage'
    }
  }

  private async cachedGet<T> (field: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
    const object = await this.cache.get(`OraclesController.${field}`, fetch, { ttl })
    return requireValue(object, field)
  }
}

function requireValue<T> (value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`failed to compute: ${name}`)
  }
  return value
}
