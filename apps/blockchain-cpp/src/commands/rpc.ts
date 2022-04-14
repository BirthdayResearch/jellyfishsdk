import { Command } from '@oclif/core'

export class RPCMethod extends Command {
  static description = 'Run an RPC command to the blockchain'

  static examples = [
    '$ defi-cli rpc getBlockchainInfo',
    '$ defi-cli rpc getBlockHeight',
    '$ defi-cli rpc getMempoolEntry TXID'
  ]

  // static args = [
  //   {name: 'method', description: 'RPC Method to call', required: true},
  //   {name: 'firstParam', description: 'First parameter to RPC Method called', required: false},
  //   {name: 'secondParam', description: 'Second parameter to RPC Method called', required: false},
  // ]

  async run (): Promise<void> {
    // const {args} = await this.parse(RPCMethod)
    // const command = await container.call('getblockchaininfo')
  }
}
