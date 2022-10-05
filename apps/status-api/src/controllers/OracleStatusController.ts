import { Controller, Get, Param } from '@nestjs/common'
import { WhaleApiClient } from '@defichain/whale-api-client'
import { Oracle } from '@defichain/whale-api-client/dist/api/oracles'
import { SemaphoreCache } from '@defichain-apps/libs/caches'
import { BadRequestApiException } from '../../../whale-api/src/module.api/_core/api.error'

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
  @Get('/:address')
  async getOracleStatus (@Param('address') oracleAddress: string): Promise<{ status: OracleStatus }> {
    return await this.cachedGet(`oracle-${oracleAddress}`, async () => {
      const oracle = await this.client.oracles.getOracleByAddress(oracleAddress)
      return await this.getAlivePriceFeed(oracle)
    }, 5) // cache status result for 5 seconds
  }

  /**
   * To provide the status of each ticker determined by the number of oracles responded given the ticker id
   *
   * @return {Promise<OracleStatus>}
   * @param pair
   */
  @Get('/ticker/:pair')
  async getOracleRespondStatus (@Param('pair') pair: string): Promise<{ status: OracleStatus }> {
    const regex: RegExp = /^[a-zA-Z.]+-[a-zA-Z]+$/
    const isValid = regex.test(pair)
    if (!isValid) {
      throw new BadRequestApiException('Provided pair is not in valid format')
    }

    const [token, currency] = pair.split('-')
    return await this.cachedGet(`oracle-${pair}`, async () => {
      const oracles = await this.client.prices.getOracles(token, currency, 60)
      const total = oracles.filter(oracle => oracle.feed !== undefined).length

      const prices = await this.client.prices.get(token, currency)
      const active = prices.price.aggregated.oracles.active

      if ((total > 3 && active <= 3) || (total <= 3 && active < 3)) {
        return { status: 'outage' }
      }
      return { status: 'operational' }
    }, 5) // cache status result for 5 seconds
  }

  private async getAlivePriceFeed (oracle: Oracle): Promise<{ status: OracleStatus }> {
    const id = oracle.id

    for (const priceFeed of oracle.priceFeeds) {
      const token = priceFeed.token
      const currency = priceFeed.currency
      const oraclePriceFeed = await this.client.oracles.getPriceFeed(id, token, currency, 1)

      // move on to the next ticker if oraclePriceFeed does not return any data
      if (oraclePriceFeed.length === 0) {
        continue
      }

      const nowEpoch = Date.now()
      const latestPublishedTime = oraclePriceFeed[0].block.medianTime * 1000
      const timeDiff = nowEpoch - latestPublishedTime

      // check if ticker last published price within 60 min, else move on to next ticker
      if (timeDiff <= (60 * 60 * 1000)) { // increasing to 60 min as there are occurrences where publishing txn did not go through (~3 times)
        return { status: 'operational' }
      }
    }
    return { status: 'outage' } // return as outage if all tickers from this oracle does not fulfill above conditions
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
