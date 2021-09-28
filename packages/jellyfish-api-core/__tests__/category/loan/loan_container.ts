import { MasterNodeRegTestContainer, StartOptions, GenesisKeys, MasterNodeKey } from '@defichain/testcontainers'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor (masternodeKey: MasterNodeKey = GenesisKeys[0]) {
    super(masternodeKey, 'defi/defichain:HEAD-5c9779c')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
