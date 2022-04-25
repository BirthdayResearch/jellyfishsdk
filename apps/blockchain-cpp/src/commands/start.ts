import { Command } from '@oclif/core'
import Dockerode from 'Dockerode'

// TODO: attach should be a flag
export class Start extends Command {
  static description = 'Start a DeFiChain Node with or without linking a local snapshot repository'

  static args = [
    { name: 'snapshot', description: 'Absolute Path to local snapshot to use and upload into docker', required: false },
    { name: 'attach', description: 'if attach - attaches terminal to docker container', required: false }
  ]

  async run (): Promise<void> {
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
      // TODO: return error if path not valid

      startOptions.HostConfig = {
        AutoRemove: true,
        Binds: [
          `${snapshot}:/data`
        ]
      }
    }
    // TODO: Refactor this

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

    // await docker.createContainer(startOptions).then(
    //   (container) => {
    //     if (container !== undefined) {
    //       container.start()
    //         .then(() => {
    //           if (args.attach === 'attach') {
    //             container.attach({ stream: true, stdout: true, stderr: true, stdin: true })
    //               .then((stream) => {
    //                 stream.pipe(process.stdout)
    //               })
    //               .catch((err) => console.log(err))
    //           } else {
    //             console.log('The local node has successfully booted up! :)')
    //             console.log('Type defi-cli --help to see the full list of commands.')
    //             console.log('Happy hacking!')
    //           }
    //         })
    //         .catch((err) => console.log(err))
    //     } else {
    //       console.log('ERR: Container is undefined. Please try again.')
    //     }
    //   }
    // ).catch((err) => console.log(err))
  }
}
