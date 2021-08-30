import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-13c045f')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
