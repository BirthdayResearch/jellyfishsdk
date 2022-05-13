import { RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(RegTestFoundationKeys[RegTestFoundationKeys.length - 1])
  }

  /**
   * Temporary remove invalid flag and configure it for development branch
   */
  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts)
      .filter(cmd => cmd !== '-eunospayaheight=7')
      .filter(cmd => cmd !== '-fortcanningheight=8')
      .filter(cmd => cmd !== '-fortcanningmuseumheight=9')
      .filter(cmd => cmd !== '-fortcanninghillheight=10')
      .filter(cmd => cmd !== '-fortcanningroadheight=11')

    return [
      ...cmd,
      '-fortcanningheight=20'
    ]
  }
}
