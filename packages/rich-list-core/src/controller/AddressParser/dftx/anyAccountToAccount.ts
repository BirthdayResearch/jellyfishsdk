import { fromScript } from '@defichain/jellyfish-address'
import { AnyAccountToAccount, CAnyAccountToAccount, DfTx } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class AnyAccountToAccountParser extends DfTxAddressParser<AnyAccountToAccount> {
  OP_CODE: number = CAnyAccountToAccount.OP_CODE

  extract (anyAccountToAccount: DfTx<AnyAccountToAccount>): string[] {
    const addresses = anyAccountToAccount.data.from.map((from) => fromScript(from.script, this.network)?.address as string)
    return addresses
  }
}
