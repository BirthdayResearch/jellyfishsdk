import { WhaleApiClient } from '../whale.api.client'

/**
 * DeFi whale endpoint for oracle related services.
 */
export class Oracles {
  constructor (private readonly client: WhaleApiClient) {
  }
}
