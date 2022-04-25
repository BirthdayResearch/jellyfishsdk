import { Command } from '@oclif/core'
import axios from 'axios'
export class Snapshots extends Command {
  static description = 'Get a list of DeFiChain Snapshots'
  async run (): Promise<void> {
    // TODO: change AWS provider location based on user location
    const snapshots = await axios.get('https://defi-snapshots.s3-ap-southeast-1.amazonaws.com/index.txt')
    console.log(snapshots.data)
  }
}
