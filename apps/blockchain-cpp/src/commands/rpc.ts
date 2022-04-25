import { Command } from '@oclif/core'
import { exec } from 'child_process'

interface argsType {
  method: string
  firstParam: string | undefined
  secondParam: string | undefined
}
export class RPCMethod extends Command {
  static description = 'Run an RPC command to the blockchain (in small caps)'

  static examples = [
    '$ defi-cli rpc getblockchaininfo',
    '$ defi-cli rpc getblockcount',
    '$ defi-cli rpc getmempoolentry TXID'
  ]

  static args = [
    { name: 'method', description: 'RPC Method to call', required: true },
    { name: 'firstParam', description: 'First parameter to RPC Method called', required: false },
    { name: 'secondParam', description: 'Second parameter to RPC Method called', required: false }
  ]

  async run (): Promise<void> {
    const { args }: {args: argsType} = await this.parse(RPCMethod)
    // TODO: Refactor these two statements below - this is just to handle undefined cases explicitly for eslint
    if (args.firstParam === undefined) {
      args.firstParam = ''
    }
    if (args.secondParam === undefined) {
      args.secondParam = ''
    }
    const script = exec(`docker exec -i 'defi-cli-container' defi-cli ${args.method} ${args.firstParam} ${args.secondParam}`)
    if (script.stdout !== null) {
      script.stdout.on('data', data => {
        console.log(data.toString())
      })
    }
    if (script.stderr !== null) {
      script.stderr.on('data', data => {
        console.log(data.toString())
      })
    }
  }
}
