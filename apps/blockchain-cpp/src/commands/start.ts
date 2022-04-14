import { Command } from '@oclif/core'
import { exec } from 'child_process'
// const DockerodeCompose = require('dockerode-compose')
export class Start extends Command {
  static description = 'Start a DeFiChain Node'

  static args = [
    { name: 'snapshot', description: 'Absolute Path to local snapshot to use and upload into docker', required: false }
  ]

  async run (): Promise<void> {
    const { args } = await this.parse(Start)
    const snapshot: string = args.snapshot
    if (snapshot !== '') {
      // TODO: return error if path not valid
      exec('> .env')
      exec(`echo "SNAPSHOT=${snapshot}" >> .env`)
      exec('docker compose up')
      // TODO: Try to make it work with dockerode
      // const docker = new Dockerode()
      // const compose = new DockerodeCompose(docker, './docker-compose.yml', 'defisnapshot')
      // await compose.pull();
      // const state = await compose.up();
    }
    console.log('The local node has successfully booted up! :)')
    console.log('Type defi-cli --help to see the full list of commands.')
    console.log('Happy hacking!')
  }
}
