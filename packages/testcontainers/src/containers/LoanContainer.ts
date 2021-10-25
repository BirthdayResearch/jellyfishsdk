import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'
import { RegTestFoundationKeys, MasterNodeKey } from '@defichain/jellyfish-network'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor (masternodeKey: MasterNodeKey = RegTestFoundationKeys[0]) {
    super(masternodeKey, 'defi/defichain:HEAD-afc41ef')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
