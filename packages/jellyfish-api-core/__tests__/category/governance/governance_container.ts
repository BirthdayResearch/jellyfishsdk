import { MasterNodeRegTestContainer, StartOptions } from '@defichain/testcontainers'

export class GovernanceMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor () {
    super(undefined, 'defi/defichain:HEAD-644977590')
  }

  /**
   * Temporary remove invalid flag and configure it for development branch
   */
  protected getCmd (opts: StartOptions): string[] {
    const cmd = super.getCmd(opts)

    return [
      ...cmd,
      '-grandcentralheight=16'
    ]
  }
}
