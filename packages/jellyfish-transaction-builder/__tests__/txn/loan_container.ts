import { MasterNodeRegTestContainer, StartOptions, GenesisKeys, MasterNodeKey } from '@defichain/testcontainers'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor (masternodeKey: MasterNodeKey = GenesisKeys[0]) {
    super(undefined, 'defi/defichain:HEAD-333f43e')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
