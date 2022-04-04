import {Command} from '@oclif/core'

export default class Start extends Command {
  static description = 'Start a DeFiChain Node'

  // Run docker compose automatically? Is that possible?
  async run() {
    console.log('Starting up defi node...')
  }
}
