import { WhaleApiClient } from '../src/lib/WhaleApiClient'

/**
 * a Stubbed WhaleApiClient for test purpose.
 * without setting up WhaleApiServer
 * stub each required method one by one as usage is minimal
 */
export class StubbedWhaleApiClient implements WhaleApiClient {
  address = {
    getBalance: async (address: string): Promise<string> => {
      const power = Math.round(Math.random() * 4)
      const coef = Math.random()
      return `${coef * Math.pow(10, power)}`
    }
  }
}
