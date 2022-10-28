import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:epic-grandcentral-0cdada064')
  }

  /**
   * Temporary remove invalid flag and configure it for development branch
   */
  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts)
      .filter(cmd => cmd !== '-regtest-skip-loan-collateral-validation')

    return [
      ...cmd,
      '-grandcentralheight=16'
    ]
  }
}
