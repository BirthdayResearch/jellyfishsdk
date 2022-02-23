import { fromScript } from '@defichain/jellyfish-address'
import { AccountToAccount, CAccountToAccount, DfTx } from '@defichain/jellyfish-transaction'
import { DfTxAddressParser } from './_abstract'

export class AccountToAccountParser extends DfTxAddressParser<AccountToAccount> {
  OP_CODE: number = CAccountToAccount.OP_CODE

  extract (accountToAccount: DfTx<AccountToAccount>): string[] {
    const address = fromScript(accountToAccount.data.from, this.network)?.address as string
    return [address]
  }
}
