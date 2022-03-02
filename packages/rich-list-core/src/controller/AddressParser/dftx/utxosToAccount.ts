import { fromScript } from '@defichain/jellyfish-address'
import { CUtxosToAccount, DfTx, UtxosToAccount } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class UtxosToAccountParser extends DfTxAddressParser<UtxosToAccount> {
  OP_CODE: number = CUtxosToAccount.OP_CODE

  extract (accountToAccount: DfTx<UtxosToAccount>): string[] {
    const addresses = accountToAccount.data.to
      .map((toScriptBal) => fromScript(toScriptBal.script, this.network)?.address as string)
    return addresses
  }
}
