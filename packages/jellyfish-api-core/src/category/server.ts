import { ApiClient } from '../.'

export class Server {
  private readonly client: ApiClient

  constructor (client: ApiClient) {
    this.client = client
  }

  /**
   * Returns details of the RPC server
   *
   * @return {Promise<RpcInfo>}
   */
  async getRpcInfo (): Promise<RpcInfo> {
    return await this.client.call('getrpcinfo', [], 'number')
  }
}

export interface ActiveCommand {
  method: string
  duration: number
}

export interface RpcInfo {
  active_commands: ActiveCommand[]
  logpath: string
}
