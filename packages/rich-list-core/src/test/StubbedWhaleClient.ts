import { ApiMethod, ResponseAsString, WhaleApiClient } from '@defichain/whale-api-client'

/**
 * a Stubbed WhaleApiClient for test purpose.
 * without setting up WhaleApiServer
 * stub each required method one by one as usage is minimal
 */
export class StubbedWhaleApiClient extends WhaleApiClient {
  constructor () {
    super({ url: 'stubbed' })
    this.stubMethods()
  }

  async requestAsString (method: ApiMethod, path: string, body?: string): Promise<ResponseAsString> {
    // stub the api method thus test case logic should not reach this point
    throw new Error(`Endpoint "${method}/${path}" not stubbed for test`)
  }

  private stubMethods (): void {
    this.address.getBalance = async (address: string): Promise<string> => {
      const power = Math.round(Math.random() * 4)
      const coef = Math.random()
      return `${coef * Math.pow(10, power)}`
    }
  }
}
