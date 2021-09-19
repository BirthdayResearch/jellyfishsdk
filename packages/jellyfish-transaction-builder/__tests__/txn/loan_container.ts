import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-3882db7')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
