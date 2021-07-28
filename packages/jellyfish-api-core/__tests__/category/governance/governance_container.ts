import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-316148f')
  }

  protected getCmd (opts: StartOptions): string[] {
    // temporary remove -eunospayaheight=7 due to invalid flag
    const cmd = super.getCmd(opts)
    cmd.splice(cmd.indexOf('-eunospayaheight=7'), 1)

    return [
      ...cmd,
      '-fortcanningheight=8'
    ]
  }
}
