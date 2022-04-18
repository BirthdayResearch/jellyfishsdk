import { fromScript } from '@defichain/jellyfish-address'
import { CDepositToVault, DepositToVault, DfTx } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class DepositToVaultParser extends DfTxAddressParser<DepositToVault> {
  OP_CODE: number = CDepositToVault.OP_CODE

  extract (depositToVault: DfTx<DepositToVault>): string[] {
    const address = fromScript(depositToVault.data.from, this.network)?.address as string
    return [address]
  }
}
