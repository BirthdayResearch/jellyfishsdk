import { Command } from '@oclif/core'
import { exec } from 'child_process'

interface argsType {
  folderPath: string
}
export class TakeSnapshot extends Command {
  static description = 'Take a snapshot of the blockchain data files from the container into your PC'

  static examples = [
    'defi-cli take-snapshot /path/to/host/folder'
  ]

  static args = [{ name: 'folderPath', description: 'Absolute Path to directory on host machine to download snapshot into', required: true }]

  public async run (): Promise<void> {
    const { args }: {args: argsType} = await this.parse(TakeSnapshot)
    const folderPath: string = args.folderPath
    console.log(`Transferring snapshot into ${folderPath}...`)
    console.log('This will take a while - depending on how big the snapshot is')
    await exec(`docker cp defi-cli-container:/data/. ${folderPath}`)
  }
}
