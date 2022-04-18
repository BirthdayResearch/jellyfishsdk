import { Command } from '@oclif/core'
import Dockerode from 'Dockerode'

// TODO: OUTPUT ONLY STREAM
export class Start extends Command {
  static description = 'Start a DeFiChain Node with or without linking a local snapshot repository'

  static args = [
    { name: 'snapshot', description: 'Absolute Path to local snapshot to use and upload into docker', required: false },
    { name: 'attach', description: 'if true - attaches terminal to docker container', required: false }
  ]

  async run (): Promise<void> {
    const { args } = await this.parse(Start)
    const snapshot: string = args.snapshot

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

    if (snapshot !== '') {
      // TODO: return error if path not valid

      startOptions.HostConfig = {
        AutoRemove: true,
        Binds: [
          `${snapshot}:/data`
        ]
      }
    }
    docker.createContainer(startOptions).then(
      (container) => {
        if (container !== undefined) {
          container.start()
            .then(() => {
              // TODO: Allow streaming of Docker Container output while keeping input in our CLI
              if (args.attach === 'true') {
                container.attach({ stream: true, stdout: true, stderr: true, stdin: true })
                  .then((stream) => {
                    stream.pipe(process.stdout)
                  })
                  .catch((err) => console.log(err))
              } else {
                console.log('The local node has successfully booted up! :)')
                console.log('Type defi-cli --help to see the full list of commands.')
                console.log('Happy hacking!')
              }
            })
            .catch((err) => console.log(err))
        } else {
          console.log('ERR: Container is undefined. Please try again.')
        }
      }
    ).catch((err) => console.log(err))
  }
}
