import {Command} from '@oclif/core'

export class MyCommand extends Command {
  static description = 'This is goodbye'

  async run() {
    console.log('running my command')
  }
}
