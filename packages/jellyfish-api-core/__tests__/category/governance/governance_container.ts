import { MasterNodeRegTestContainer, StartOptions, GenesisKeys } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-3c03721')
  }

  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts).filter(cmd => cmd !== '-eunospayaheight=7') // temporary remove -eunospayaheight=7 due to invalid flag
    return [
      ...cmd,
      '-fortcanningheight=8',
      '-dummypos=0', // Needed to expire proposals
      `-masternode_operator=${GenesisKeys[1].operator.address}`,
      `-masternode_operator=${GenesisKeys[2].operator.address}`
    ]
  }
}
