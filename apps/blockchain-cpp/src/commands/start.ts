import { Command } from '@oclif/core'
import Dockerode from 'Dockerode'

// TODO: OUTPUT ONLY STREAM AND FIX CALLBACK ERROR HANDLING
export class Start extends Command {
  static description = 'Start a DeFiChain Node with or without linking a local snapshot repository'

  static args = [
    { name: 'snapshot', description: 'Absolute Path to local snapshot to use and upload into docker', required: false }
  ]

  async run (): Promise<void> {
    const { args } = await this.parse(Start)
    const snapshot: string = args.snapshot

    const docker = new Dockerode()

    const startOptions = {
      Image: 'defi/defichain:2.6.0',
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      OpenStdin: true,
      StdinOnce: true,
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
      // TODO: allow user to get into the docker container CLI in seperate command
      // const container = docker.getContainer('defisnapshot_defi-blockchain')
      // container.attach({stream:true, stdout:true, stderr:true}, function handler(err, stream) {
      //   container.modem.demuxStream(stream, process.stdout, process.stderr);
      // })
    }
    docker.createContainer(startOptions).then(
      (container) => {
        if (container !== undefined) {
          container.start()
            .then(() => {
              console.log('The local node has successfully booted up! :)')
              console.log('Type defi-cli --help to see the full list of commands.')
              console.log('Happy hacking!')
              // TODO: Allow streaming of Docker Container output while keeping input in our CLI
              container.attach({ stream: true, stdout: true, stderr: true })
                .then((stream) => {
                  container.modem.demuxStream(stream, process.stdout, process.stderr)
                })
                .catch((err) => console.log(err))
            })
            .catch((err) => console.log(err))
        } else {
          console.log('ERR: Container is undefined. Please try again.')
        }
      }
    ).catch((err) => console.log(err))
    // docker.createContainer(startOptions, ((err:string, container) => {
    //       if (container !== undefined) {
    //         container.start(function(err: string): void {
    //           if (err) {
    //             console.log (err)
    //           }
    //           else {
    //             console.log('The local node has successfully booted up! :)')
    //             console.log('Type defi-cli --help to see the full list of commands.')
    //             console.log('Happy hacking!')
    //             // TODO: Allow streaming of Docker Container output while keeping input in our CLI
    //             container.attach({stream: true, stdout: true, stderr: true}, function (err, stream) {
    //               container.modem.demuxStream(stream, process.stdout, process.stderr);
    //             });
    //           }
    //         })
    //       }
    //       else {
    //         console.log("ERR: Container is undefined. Please try again.")
    //       }
    //   }))
  }
}
