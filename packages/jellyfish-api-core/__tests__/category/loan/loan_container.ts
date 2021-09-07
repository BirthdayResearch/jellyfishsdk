import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-a7e7ac1')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
