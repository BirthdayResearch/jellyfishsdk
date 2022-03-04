import { PlaygroundApiClient } from '../PlaygroundApiClient'

export class Playground {
  constructor (private readonly client: PlaygroundApiClient) {
  }

  /**
   * @return {Promise<Info>} of playground
   */
  async info (): Promise<Info> {
    return await this.client.requestData('GET', 'info')
  }
}

export interface Info {
  block: {
    count: number
    hash: string
  }
}
