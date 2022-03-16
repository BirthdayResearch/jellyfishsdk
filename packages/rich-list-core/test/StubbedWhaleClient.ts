import { ApiMethod, ResponseAsString, WhaleApiClient } from '@defichain/whale-api-client'

/**
 * a Stubbed WhaleApiClient for test purpose.
 * without setting up WhaleApiServer
 * stub each required method one by one as usage is minimal
 */
export class StubbedWhaleApiClient extends WhaleApiClient {
  constructor () {
    super({ url: 'stubbed' })
  }

  async requestAsString (method: ApiMethod, path: string, body?: string): Promise<ResponseAsString> {
    const pathComponent = path.split('/')

    if (method === 'GET' && pathComponent[0] === 'address' && pathComponent[2] === 'balance') {
      const power = Math.round(Math.random() * 4)
      const coef = Math.random()
      return {
        status: 200,
        body: JSON.stringify({ data: `${coef * Math.pow(10, power)}` })
      }
    }

    throw new Error(`Endpoint "${path}" not stubbed for test`)
  }
}
