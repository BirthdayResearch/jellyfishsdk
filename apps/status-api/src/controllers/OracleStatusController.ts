import { Controller, Get, Query } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { OraclePriceFeed } from '@defichain/whale-api-client/dist/api/Oracles'
import { SemaphoreCache } from '../../../whale/src/module.api/cache/semaphore.cache'

type OracleStatus = 'outage' | 'operational'

@Controller('oracles')
export class OracleStatusController {
  constructor (
    private readonly client: WhaleApiClient,
    protected readonly cache: SemaphoreCache
  ) {
  }

  /**
   * To provide the status of each oracle given the address based on the last published time for any given token
   *
   * @param oracleAddress
   * @return {Promise<OracleStatus>}
   */
  @Get()
  async getOracleStatus (
    @Query('address') oracleAddress: string
  ): Promise<{ status: OracleStatus }> {
    const oraclePriceFeed: OraclePriceFeed = await this.cachedGet(`oracle-${oracleAddress}`, async () => {
      const oracle = await this.client.oracles.getOracleByAddress(oracleAddress)
      return (await this.client.oracles.getPriceFeed(oracle.id, oracle.priceFeeds[0].token, oracle.priceFeeds[0].currency, 1))[0]
    }, 5000)

    const nowEpoch = Date.now()
    const latestPublishedTime = oraclePriceFeed.block.medianTime * 1000
    const timeDiff = nowEpoch - latestPublishedTime

    return {
      status: timeDiff <= (45 * 60 * 1000) ? 'operational' : 'outage'
    }
  }

  private async cachedGet<T> (field: string, fetch: () => Promise<T>, ttl: number): Promise<T> {
    const object = await this.cache.get(`OracleStatusController.${field}`, fetch, { ttl })
    return requireValue(object, field)
  }
}

function requireValue<T> (value: T | undefined, name: string): T {
  if (value === undefined) {
    throw new Error(`failed to compute: ${name}`)
  }
  return value
}
