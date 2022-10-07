import { BigNumber } from '@defichain/jellyfish-api-core'
import { JsonRpcClient } from '@defichain/jellyfish-api-jsonrpc'
import { Method, ResponseAsString, WhaleApiClient } from '@defichain/whale-api-client'

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

  async requestAsString (method: Method, path: string, body?: string): Promise<ResponseAsString> {
    // stub the api method thus test case logic should not reach this point
    throw new Error(`Endpoint "${method}/${path}" not stubbed for test`)
  }

  private stubMethods (): void {
    this.address.getBalance = async (address: string): Promise<string> => {
      // const power = Math.round(Math.random() * 4)
      // const coef = Math.random()
      const utxoBals = (await this.rpcClient.wallet.listUnspent()).filter(val => val.address === address)
      let totalUtxoBal = new BigNumber(0)
      utxoBals.forEach(utxo => {
        totalUtxoBal = totalUtxoBal.plus(utxo.amount)
      })
      // So this is done specifically this way
      // As there is some conflict with the previous test cases
      // TODO: Determine if we should use rpcClient for stubbing, or
      // keep to using random values, as its not compatible with each other.
      return totalUtxoBal.toString()
    }
  }
}
