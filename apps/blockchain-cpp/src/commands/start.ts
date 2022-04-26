import { Command } from '@oclif/core'
import Dockerode from 'Dockerode'
import { existsSync } from 'fs'
// TODO: attach should be a flag

function checkSnapshotValidity (snapshotFolders: string[]): boolean {
  let valid = true
  snapshotFolders.forEach((folder) => {
    if (!existsSync(folder)) {
      console.log(`${folder} does not exist in path!`)
      valid = false
    }
  })
  return valid
}
export class Start extends Command {
  static description = 'Start a DeFiChain Node with or without linking a local snapshot repository'

  static args = [
    { name: 'snapshot', description: 'Absolute Path to local snapshot to use and upload into docker', required: false },
    { name: 'attach', description: 'if attach - attaches terminal to docker container', required: false }
  ]

  async run (): Promise<void> {
    console.log(await this.parse(Start))
    const { args } = await this.parse(Start)
    const docker = new Dockerode()
    const startOptions = {
      Image: 'defi/defichain:2.6.0',
      name: 'defi-cli-container',
      AttachStdin: false,
      AttachStdout: false,
      AttachStderr: false,
      Tty: false,
      OpenStdin: false,
      StdinOnce: false,
      HostConfig: {}
    }
    const snapshot: string = args.snapshot
    if (snapshot !== undefined) {
      const snapshotFolders = [
        `${snapshot}/anchors`,
        `${snapshot}/blocks`,
        `${snapshot}/burn`,
        `${snapshot}/chainstate`,
        `${snapshot}/enhancedcs`,
        `${snapshot}/history`,
        `${snapshot}/indexes`,
        `${snapshot}/spv`
      ]
      if (!checkSnapshotValidity(snapshotFolders)) {
        console.log(`Your snapshot path: ${snapshot}, appears to be invalid.`)
        console.log('Please check your path again!')
        return
      }
      startOptions.HostConfig = {
        AutoRemove: true,
        Binds: [
          `${snapshot}:/data`
        ]
      }
      console.log('Valid Snapshot loaded!')
    }
    try {
      const container = await docker.createContainer(startOptions)
      await container.start()
      if (args.attach === 'attach') {
        const stream = await container.attach({ stream: true, stdout: true, stderr: true, stdin: true })
        stream.pipe(process.stdout)
      } else {
        console.log('The local node has successfully booted up! :)')
        console.log('Type defi-cli --help to see the full list of commands.')
        console.log('Happy hacking!')
      }
    } catch (err) {
      console.log(err)
    }
  }
}
