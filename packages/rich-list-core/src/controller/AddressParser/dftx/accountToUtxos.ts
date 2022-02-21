import { fromScript } from '@defichain/jellyfish-address'
import { AccountToUtxos, CAccountToUtxos, DfTx } from '@defichain/jellyfish-transaction'
import { ActiveAddress } from '../ActiveAddress'
import { DfTxAddressParser } from './_abstract'

export class AccountToUtxosParser extends DfTxAddressParser<AccountToUtxos> {
  OP_CODE: number = CAccountToUtxos.OP_CODE

  extract (accountToAccount: DfTx<AccountToUtxos>): ActiveAddress[] {
    const address = fromScript(accountToAccount.data.from, this.network)?.address as string
    return accountToAccount.data.balances.map(tb => ({
      tokenId: tb.token,
      address: address
    }))
  }
}
