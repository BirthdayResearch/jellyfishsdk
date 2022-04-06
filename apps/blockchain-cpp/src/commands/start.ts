import {Command} from '@oclif/core'
import {exec} from 'node:child_process'

export default class Start extends Command {
  static description = 'Start a DeFiChain Node'

  async run() {
    const script = exec('docker run -d --name definode defi/defichain')
    script.stdout!.on('data', data => {
      console.log(data.toString())
    })
    script.stderr!.on('data', data => {
      console.log(data.toString())
    })
    script.on('exit', code => {
      console.log(`program ended with ${code}`)
    })
  }
}
