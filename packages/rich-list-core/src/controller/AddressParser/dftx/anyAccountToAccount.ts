import { fromScript } from '@defichain/jellyfish-address'
import { AnyAccountToAccount, CAnyAccountToAccount, DfTx } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class AnyAccountToAccountParser extends DfTxAddressParser<AnyAccountToAccount> {
  OP_CODE: number = CAnyAccountToAccount.OP_CODE

  extract (anyAccountToAccount: DfTx<AnyAccountToAccount>): string[] {
    const fromAddresses = anyAccountToAccount.data.from
      .map((fromScriptBal) => fromScript(fromScriptBal.script, this.network)?.address as string)
    const toAddresses = anyAccountToAccount.data.to
      .map((toScriptBal) => fromScript(toScriptBal.script, this.network)?.address as string)

    return [...fromAddresses, ...toAddresses]
  }
}
