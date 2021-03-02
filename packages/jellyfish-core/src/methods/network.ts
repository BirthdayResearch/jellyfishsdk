import {Client} from '../api'

export class Network {
  private readonly client: Client

  constructor(client: Client) {
    this.client = client
  }

  /**
   * Requests that a ping be sent to all other nodes, to measure ping time.
   * Results provided in getpeerinfo, pingtime and pingwait fields are decimal seconds.
   * Ping command is handled in queue with all other commands, so it measures processing backlog, not just network ping.
   */
  async ping(): Promise<any> {
    return this.client.call('ping', [])
  }
}
