import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-5c71531')
  }

  /**
   * Temporary remove invalid flag and configure it for development branch
   */
  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts)
      .filter(cmd => cmd !== '-eunospayaheight=7')
      .filter(cmd => cmd !== '-fortcanningheight=8')

    return [
      ...cmd,
      '-fortcanningheight=9'
    ]
  }
}
