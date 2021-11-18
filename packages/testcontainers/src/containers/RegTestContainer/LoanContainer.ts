import { MasterNodeKey, RegTestFoundationKeys } from '@defichain/jellyfish-network'
import { StartOptions } from '../DeFiDContainer'
import { MasterNodeRegTestContainer } from './Masternode'

export class LoanMasterNodeRegTestContainer extends MasterNodeRegTestContainer {
  constructor (masternodeKey: MasterNodeKey = RegTestFoundationKeys[0]) {
    super(masternodeKey, 'defi/defichain:HEAD-97ba5bf')
  }

  protected getCmd (opts: StartOptions): string[] {
    return [
      ...super.getCmd(opts),
      '-txnotokens=0', '-amkheight=50', '-bayfrontheight=50', '-bayfrontgardensheight=50', '-dakotaheight=100', '-eunosheight=100', '-eunospayaheight=100', '-fortcanningheight=100', '-vaultindex=1'
    ]
  }
}
