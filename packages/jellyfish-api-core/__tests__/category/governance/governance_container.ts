import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-5c71531')
  }

  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts).filter(cmd => cmd !== '-eunospayaheight=7') // temporary remove -eunospayaheight=7 due to invalid flag
    return [
      ...cmd,
      '-fortcanningheight=8',
      '-dummypos=0' // Needed to expire proposals
    ]
  }
}
