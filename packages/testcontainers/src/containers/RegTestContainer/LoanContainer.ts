import { MasterNodeKey, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { StartOptions } from '../DeFiDContainer'
import { MasterNodeRegTestContainer } from './Masternode'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor (masternodeKey: MasterNodeKey = RegTestFoundationKeys[0]) {
    super(masternodeKey, 'defi/defichain:master-5772b6c')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-fortcanningheight=8'
    ]
  }
}
