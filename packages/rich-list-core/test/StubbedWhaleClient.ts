import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { ApiMethod, ResponseAsString, WhaleApiClient } from '@defichain/whale-api-client'

/**
 * a Stubbed WhaleApiClient for test purpose.
 * without setting up WhaleApiServer
 * stub each required method one by one as usage is minimal
 */
export class StubbedWhaleApiClient extends WhaleApiClient {
  constructor (private readonly rpcClient: JsonRpcClient) {
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
      const utxoBal = (await this.rpcClient.wallet.listUnspent()).find(val => val.address === address)
      // So this is done specifically this way
      // As there is some conflict with the previous test cases
      // TODO: Determine if we should use rpcClient for stubbing, or
      // keep to using random values, as its not compatible with each other.
      return utxoBal?.amount.toString() ?? `${coef * Math.pow(10, power)}`
    }
  }
}
