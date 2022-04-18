import { fromScript } from '@defichain/jellyfish-address'
import { CWithdrawFromVault, DfTx, WithdrawFromVault } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class WithdrawFromVaultParser extends DfTxAddressParser<WithdrawFromVault> {
  OP_CODE: number = CWithdrawFromVault.OP_CODE

  extract (withdrawFromVault: DfTx<WithdrawFromVault>): string[] {
    const address = fromScript(withdrawFromVault.data.to, this.network)?.address as string
    return [address]
  }
}
